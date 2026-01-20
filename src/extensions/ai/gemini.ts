import { nanoid } from 'nanoid';

import { Buffer } from 'buffer';

import { getUuid } from '@/shared/lib/hash';

import {
  AIConfigs,
  AIGenerateParams,
  AIImage,
  AIMediaType,
  AIProvider,
  AITaskResult,
  AITaskStatus,
} from './types';

/**
 * Gemini configs
 */
export interface GeminiConfigs extends AIConfigs {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Gemini provider
 */
export class GeminiProvider implements AIProvider {
  // provider name
  readonly name = 'gemini';
  // provider configs
  configs: GeminiConfigs;

  // init provider
  constructor(configs: GeminiConfigs) {
    this.configs = configs;
  }

  // generate task
  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const { mediaType, model, prompt, options } = params;

    if (mediaType !== AIMediaType.IMAGE) {
      throw new Error(`mediaType not supported: ${mediaType}`);
    }

    if (!model) {
      throw new Error('model is required');
    }

    if (!prompt) {
      throw new Error('prompt is required');
    }

    const baseUrl = (
      this.configs.baseUrl || 'https://generativelanguage.googleapis.com'
    )
      .trim()
      .replace(/\/+$/, '');
    const isOfficialEndpoint = baseUrl.includes('googleapis.com');

    const apiUrl = isOfficialEndpoint
      ? `${baseUrl}/v1beta/models/${model}:generateContent?key=${this.configs.apiKey}`
      : `${baseUrl}/v1beta/models/${model}:generateContent`;

    const requestParts: any[] = [
      {
        text: prompt,
      },
    ];

    if (options && options.image_input && Array.isArray(options.image_input)) {
      for (const imageUrl of options.image_input) {
        try {
          if (typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
            const m = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(imageUrl);
            if (m) {
              const mimeType = m[1] || 'image/jpeg';
              const isBase64 = Boolean(m[2]);
              const raw = m[3] || '';
              const base64Image = isBase64
                ? raw
                : Buffer.from(decodeURIComponent(raw), 'utf8').toString('base64');

              requestParts.push({
                inlineData: {
                  mimeType,
                  data: base64Image,
                },
              });
              continue;
            }
          }

          const imageResp = await fetch(imageUrl);
          if (imageResp.ok) {
            const arrayBuffer = await imageResp.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64Image = buffer.toString('base64');
            const mimeType =
              imageResp.headers.get('content-type') || 'image/jpeg';

            requestParts.push({
              inlineData: {
                mimeType,
                data: base64Image,
              },
            });
          }
        } catch (e) {
          console.error('failed to fetch image input', imageUrl, e);
        }
      }
    }

    const { image_input, size, ...generationConfig } = options || {};

    const payload = {
      contents: [
        {
          role: 'user',
          parts: requestParts,
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
        responseMimeType: 'image/png',
        ...generationConfig,
      },
    };

    let data: any;
    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.configs.apiKey,
          Authorization: `Bearer ${this.configs.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        try {
          const errJson = JSON.parse(errorText);
          const code = errJson?.error?.code;
          const status = errJson?.error?.status;
          if (resp.status === 429 || code === 429 || status === 'RESOURCE_EXHAUSTED') {
            const details: any[] = Array.isArray(errJson?.error?.details)
              ? errJson.error.details
              : [];
            const errorInfo = details.find(
              (d: any) => d?.['@type'] === 'type.googleapis.com/google.rpc.ErrorInfo'
            );
            const retryInfo = details.find(
              (d: any) => d?.['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
            );
            const quotaResetTimeStamp = errorInfo?.metadata?.quotaResetTimeStamp;
            const quotaResetDelay = errorInfo?.metadata?.quotaResetDelay;
            const retryDelay = retryInfo?.retryDelay;

            throw new Error(
              `gemini quota exhausted (model=${model}, status=${resp.status}, quotaResetTimeStamp=${quotaResetTimeStamp || 'unknown'}, quotaResetDelay=${quotaResetDelay || 'unknown'}, retryDelay=${retryDelay || 'unknown'}, body=${errorText})`
            );
          }
        } catch {
          // ignore
        }

        throw new Error(`request failed with status: ${resp.status}, body: ${errorText}`);
      }

      data = await resp.json();
    } catch (e: any) {
      throw e;
    }

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('no candidates returned');
    }

    const taskId = nanoid(); // Gemini API doesn't return a task ID for synchronous generation
    const candidate = data.candidates[0];
    const parts = candidate.content?.parts;

    if (!parts || parts.length === 0) {
      throw new Error('no parts returned');
    }

    const imagePart = parts.find(
      (p: any) =>
        p?.inlineData ||
        p?.inline_data ||
        p?.fileData ||
        p?.file_data ||
        p?.fileUri ||
        p?.file_uri
    );

    if (!imagePart) {
      const textParts = parts
        .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
        .filter(Boolean);
      if (textParts.length > 0) {
        const preview = String(textParts.join('\n\n')).slice(0, 400);
        const finishReason = candidate?.finishReason;
        const safetyRatings = candidate?.safetyRatings;
        const promptFeedback = data?.promptFeedback;
        throw new Error(
          `no image part returned (model returned text only, finishReason=${JSON.stringify(finishReason)}, safetyRatings=${JSON.stringify(safetyRatings)}, promptFeedback=${JSON.stringify(promptFeedback)}, preview=${JSON.stringify(preview)})`
        );
      }

      throw new Error('no image part returned');
    }

    const inlineData = imagePart.inlineData || imagePart.inline_data;
    const fileData = imagePart.fileData || imagePart.file_data;
    const mimeType =
      inlineData?.mimeType ||
      inlineData?.mime_type ||
      fileData?.mimeType ||
      fileData?.mime_type ||
      'image/png';
    const base64Data = inlineData?.data;
    const fileUri =
      fileData?.fileUri ||
      fileData?.file_uri ||
      imagePart.fileUri ||
      imagePart.file_uri;

    let imageUrl: string | undefined;
    if (typeof fileUri === 'string' && /^https?:\/\//i.test(fileUri)) {
      imageUrl = fileUri;
    } else if (
      typeof base64Data === 'string' &&
      /^https?:\/\//i.test(base64Data)
    ) {
      imageUrl = base64Data;
    } else {
      if (typeof base64Data !== 'string' || !base64Data) {
        throw new Error('no image data returned');
      }

      try {
        const { getStorageService } = await import('@/shared/services/storage');
        const storageService = await getStorageService();
        const buffer = Buffer.from(String(base64Data || ''), 'base64');
        const ext = String(mimeType || 'image/png').split('/')[1] || 'png';
        const key = `gemini/image/${getUuid()}.${ext}`;

        const uploadResult = await storageService.uploadFile({
          body: buffer,
          key,
          contentType: mimeType,
        });

        if (!uploadResult || !uploadResult.url) {
          throw new Error('upload image failed');
        }
        imageUrl = uploadResult.url;
      } catch {
        imageUrl = `data:${mimeType};base64,${base64Data}`;
      }
    }

    // replace base64 data with url to save db space
    if (inlineData && imageUrl) {
      inlineData.data = imageUrl;
      // Ensure the original data object is updated
      const partIndex = parts.findIndex((p: any) => p === imagePart);
      if (partIndex !== -1 && data.candidates?.[0]?.content?.parts) {
        const originalPart = data.candidates[0].content.parts[partIndex];
        if (originalPart?.inlineData) {
          originalPart.inlineData.data = imageUrl;
          originalPart.thoughtSignature = '';
        }
        if (originalPart?.inline_data) {
          originalPart.inline_data.data = imageUrl;
          originalPart.thoughtSignature = '';
        }
      }
    }

    const image: AIImage = {
      id: nanoid(),
      createTime: new Date(),
      imageType: mimeType || 'image/png',
      imageUrl: imageUrl || '',
    };

    return {
      taskStatus: AITaskStatus.SUCCESS,
      taskId: taskId,
      taskInfo: {
        images: [image],
        status: 'success',
        createTime: new Date(),
      },
      taskResult: data,
    };
  }
}
