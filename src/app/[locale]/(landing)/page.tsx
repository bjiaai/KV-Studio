import { getTranslations, setRequestLocale } from 'next-intl/server';

import KvWorkshopPage from './kv-workshop/page';

export const revalidate = 3600;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await getTranslations('pages.index');

  return <KvWorkshopPage />;
}
