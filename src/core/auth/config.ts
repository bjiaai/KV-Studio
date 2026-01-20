import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { oneTap } from 'better-auth/plugins';
import { getLocale } from 'next-intl/server';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import * as schema from '@/config/db/schema';
import { VerifyEmail } from '@/shared/blocks/email/verify-email';
import {
  getCookieFromCtx,
  getHeaderValue,
  guessLocaleFromAcceptLanguage,
} from '@/shared/lib/cookie';
import { getUuid } from '@/shared/lib/hash';
import { getClientIp } from '@/shared/lib/ip';
import { grantCreditsForNewUser } from '@/shared/models/credit';
import { getEmailService } from '@/shared/services/email';
import { grantRoleForNewUser } from '@/shared/services/rbac';

// Best-effort dedupe to prevent sending verification emails too frequently.
// This is especially helpful in dev/hot reload, transient network conditions,
// and to add a server-side throttle beyond any client-side cooldown.
const recentVerificationEmailSentAt = new Map<string, number>();
const VERIFICATION_EMAIL_MIN_INTERVAL_MS = 60_000;

// Static auth options - NO database connection
// This ensures zero database calls during build time
const authOptions = {
  appName: envConfigs.app_name,
  baseURL: envConfigs.auth_url,
  secret: envConfigs.auth_secret,
  trustedOrigins: envConfigs.app_url ? [envConfigs.app_url] : [],
  user: {
    // Allow persisting custom columns on user table.
    // Without this, better-auth may ignore extra properties during create/update.
    additionalFields: {
      utmSource: {
        type: 'string',
        // Not user-editable input; we set it internally.
        input: false,
        required: false,
        defaultValue: '',
      },
      ip: {
        type: 'string',
        input: false,
        required: false,
        defaultValue: '',
      },
      locale: {
        type: 'string',
        input: false,
        required: false,
        defaultValue: '',
      },
    },
  },
  advanced: {
    database: {
      generateId: () => getUuid(),
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  logger: {
    verboseLogging: false,
    // Disable all logs during build and production
    disabled: true,
  },
};

// get auth options with configs
export async function getAuthOptions(configs: Record<string, string>) {
  const emailVerificationEnabled =
    configs.email_verification_enabled === 'true' && !!configs.resend_api_key;

  const plugins: any[] = [];

  if (
    configs.feishu_auth_enabled === 'true' &&
    configs.feishu_client_id &&
    configs.feishu_client_secret
  ) {
    plugins.push({
      id: 'feishu-oauth',
      init: (ctx: any) => {
        const feishuAppId = String(configs.feishu_client_id || '')
          .trim()
          .replace(/^['"]|['"]$/g, '');
        const feishuAppSecret = String(configs.feishu_client_secret || '')
          .trim()
          .replace(/^['"]|['"]$/g, '');

        const provider: any = {
          id: 'feishu',
          name: 'feishu',
          options: {
            overrideUserInfoOnSignIn: true,
          },
          createAuthorizationURL: async ({ state, redirectURI, scopes }: any) => {
            const url = new URL('https://open.feishu.cn/open-apis/authen/v1/index');
            url.searchParams.set('app_id', feishuAppId);
            url.searchParams.set('redirect_uri', redirectURI);
            url.searchParams.set('state', state);
            url.searchParams.set('response_type', 'code');
            const scope =
              Array.isArray(scopes) && scopes.length
                ? scopes.join(' ')
                : 'profile email';
            url.searchParams.set('scope', scope);
            return url;
          },
          validateAuthorizationCode: async ({ code }: any) => {
            const appTokenResp = await fetch(
              'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  app_id: feishuAppId,
                  app_secret: feishuAppSecret,
                }),
              }
            );

            const appTokenJson: any = await appTokenResp.json();
            const appAccessToken = appTokenJson?.app_access_token;
            if (!appAccessToken) {
              throw new Error(
                `failed to obtain feishu app_access_token (code=${appTokenJson?.code ?? 'unknown'})`
              );
            }

            let tenantAccessToken: string | undefined;
            try {
              const tenantTokenResp = await fetch(
                'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    app_id: feishuAppId,
                    app_secret: feishuAppSecret,
                  }),
                }
              );
              const tenantTokenJson: any = await tenantTokenResp.json();
              tenantAccessToken = tenantTokenJson?.tenant_access_token;
            } catch {
              // best-effort only
            }

            const userTokenResp = await fetch(
              'https://open.feishu.cn/open-apis/authen/v1/access_token',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${appAccessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  grant_type: 'authorization_code',
                  code,
                }),
              }
            );

            const userTokenJson: any = await userTokenResp.json();
            const data = userTokenJson?.data;
            if (!data?.access_token) {
              throw new Error(
                `failed to obtain feishu user_access_token (code=${userTokenJson?.code ?? 'unknown'})`
              );
            }

            return {
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              accessTokenExpiresAt: new Date(
                Date.now() + Number(data.expires_in || 0) * 1000
              ),
              refreshTokenExpiresAt: data.refresh_expires_in
                ? new Date(Date.now() + Number(data.refresh_expires_in || 0) * 1000)
                : undefined,
              scopes: [],
              tenantAccessToken,
            };
          },
          getUserInfo: async (tokens: any) => {
            const accessToken = tokens?.accessToken;
            const tenantAccessToken = tokens?.tenantAccessToken;

            let raw: any = {};
            if (accessToken) {
              try {
                const userInfoResp = await fetch(
                  'https://open.feishu.cn/open-apis/authen/v1/user_info',
                  {
                    method: 'GET',
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                  }
                );

                const userInfoJson: any = await userInfoResp.json();
                const data = userInfoJson?.data;
                const candidate =
                  data?.user_info || data?.user || data?.userInfo || data;
                const ok =
                  userInfoResp.ok &&
                  (userInfoJson?.code === 0 || userInfoJson?.code === undefined);
                if (ok && candidate) {
                  raw = candidate;
                }
              } catch {
                // ignore
              }
            }

            if (!raw?.email && !raw?.enterprise_email && tenantAccessToken) {
              const userId = raw?.user_id || raw?.open_id || raw?.union_id;
              const userIdType = raw?.user_id
                ? 'user_id'
                : raw?.open_id
                  ? 'open_id'
                  : raw?.union_id
                    ? 'union_id'
                    : '';
              if (userId && userIdType) {
                try {
                  const url = new URL(
                    `https://open.feishu.cn/open-apis/contact/v3/users/${encodeURIComponent(
                      String(userId)
                    )}`
                  );
                  url.searchParams.set('user_id_type', userIdType);
                  url.searchParams.set('department_id_type', 'open_department_id');

                  const contactResp = await fetch(url.toString(), {
                    method: 'GET',
                    headers: {
                      Authorization: `Bearer ${tenantAccessToken}`,
                    },
                  });
                  const contactJson: any = await contactResp.json();
                  const user = contactJson?.data?.user;
                  const ok =
                    contactResp.ok &&
                    (contactJson?.code === 0 || contactJson?.code === undefined);
                  if (ok && user) {
                    raw = {
                      ...raw,
                      email: raw?.email || user?.email,
                      enterprise_email:
                        raw?.enterprise_email || user?.enterprise_email,
                    };
                  }
                } catch {
                  // ignore
                }
              }
            }

            const id = raw.union_id || raw.open_id || raw.user_id;
            const stringId = String(id || 'unknown');

            const email =
              raw.email ||
              raw.enterprise_email ||
              `feishu_${stringId}@example.invalid`;

            const image = raw.avatar_url || raw.avatar_big || raw.avatar_middle || '';

            return {
              user: {
                id: stringId,
                name: raw.name || raw.en_name || 'Feishu User',
                email,
                image,
                emailVerified: false,
              },
              data: raw,
            };
          },
        };

        return {
          context: {
            socialProviders: [provider, ...(ctx.socialProviders || [])],
          },
        };
      },
    });
  }

  return {
    ...authOptions,
    // Add database connection only when actually needed (runtime)
    database: envConfigs.database_url
      ? drizzleAdapter(db(), {
          provider: getDatabaseProvider(envConfigs.database_provider),
          schema: schema,
        })
      : null,
    databaseHooks: {
      user: {
        create: {
          before: async (user: any, ctx: any) => {
            try {
              const ip = await getClientIp();
              if (ip) {
                user.ip = ip;
              }

              // Prefer NEXT_LOCALE cookie (next-intl). Fallback to accept-language.
              const localeFromCookie = getCookieFromCtx(ctx, 'NEXT_LOCALE');

              const localeFromHeader = guessLocaleFromAcceptLanguage(
                getHeaderValue(ctx, 'accept-language')
              );

              const locale =
                (localeFromCookie || localeFromHeader || (await getLocale())) ??
                '';

              if (locale && typeof locale === 'string') {
                user.locale = locale.slice(0, 20);
              }

              // Only set on first creation; never overwrite later.
              if (user?.utmSource) return user;

              const raw = getCookieFromCtx(ctx, 'utm_source');
              if (!raw || typeof raw !== 'string') return user;

              // Keep it small & safe.
              const decoded = decodeURIComponent(raw).trim();
              const sanitized = decoded
                .replace(/[^\w\-.:]/g, '') // allow a-zA-Z0-9_ - . :
                .slice(0, 100);

              if (sanitized) {
                user.utmSource = sanitized;
              }
            } catch {
              // best-effort only
            }
            return user;
          },
          after: async (user: any) => {
            try {
              if (!user.id) {
                throw new Error('user id is required');
              }

              // grant credits for new user
              await grantCreditsForNewUser(user);

              // grant role for new user
              await grantRoleForNewUser(user);
            } catch (e) {
              console.log('grant credits or role for new user failed', e);
            }
          },
        },
      },
    },
    emailAndPassword: {
      enabled: configs.email_auth_enabled !== 'false',
      requireEmailVerification: emailVerificationEnabled,
      // Avoid creating a session immediately after sign up when verification is required.
      autoSignIn: emailVerificationEnabled ? false : true,
    },
    ...(emailVerificationEnabled
      ? {
          emailVerification: {
            // We explicitly send verification emails from the UI with a callbackURL
            // (redirecting to /verify-email). Disabling automatic sends avoids duplicates.
            sendOnSignUp: false,
            sendOnSignIn: false,
            // After user clicks the verification link, create session automatically.
            autoSignInAfterVerification: true,
            // 24 hours
            expiresIn: 60 * 60 * 24,
            sendVerificationEmail: async (
              { user, url }: { user: any; url: string; token: string },
              _request: Request
            ) => {
              try {
                const key = String(user?.email || '').toLowerCase();
                const now = Date.now();
                const last = recentVerificationEmailSentAt.get(key) || 0;
                if (key && now - last < VERIFICATION_EMAIL_MIN_INTERVAL_MS) {
                  return;
                }
                if (key) {
                  recentVerificationEmailSentAt.set(key, now);
                }

                const emailService = await getEmailService(configs as any);
                const logoUrl = envConfigs.app_logo?.startsWith('http')
                  ? envConfigs.app_logo
                  : `${envConfigs.app_url}${envConfigs.app_logo?.startsWith('/') ? '' : '/'}${envConfigs.app_logo || ''}`;
                // Avoid blocking auth response on email sending.
                await emailService.sendEmail({
                  to: user.email,
                  subject: `Verify your email - ${envConfigs.app_name}`,
                  react: VerifyEmail({
                    appName: envConfigs.app_name,
                    logoUrl,
                    url,
                  }),
                });
              } catch (e) {
                console.log('send verification email failed:', e);
              }
            },
          },
        }
      : {}),
    socialProviders: await getSocialProviders(configs),
    plugins: [
      ...plugins,
      ...(configs.google_client_id && configs.google_one_tap_enabled === 'true'
        ? [oneTap()]
        : []),
    ],
  };
}

// get social providers with configs
export async function getSocialProviders(configs: Record<string, string>) {
  const providers: any = {};

  // google auth
  if (configs.google_client_id && configs.google_client_secret) {
    providers.google = {
      clientId: configs.google_client_id,
      clientSecret: configs.google_client_secret,
    };
  }

  // github auth
  if (configs.github_client_id && configs.github_client_secret) {
    providers.github = {
      clientId: configs.github_client_id,
      clientSecret: configs.github_client_secret,
    };
  }

  return providers;
}

// convert database provider to better-auth database provider
export function getDatabaseProvider(
  provider: string
): 'sqlite' | 'pg' | 'mysql' {
  switch (provider) {
    case 'sqlite':
      return 'sqlite';
    case 'turso':
      return 'sqlite';
    case 'postgresql':
      return 'pg';
    case 'mysql':
      return 'mysql';
    default:
      throw new Error(
        `Unsupported database provider for auth: ${envConfigs.database_provider}`
      );
  }
}
