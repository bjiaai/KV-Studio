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

export interface OpenAIConfigs extends AIConfigs {
  apiKey: string;
  baseUrl: string;
}

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  configs: OpenAIConfigs;

  constructor(configs: OpenAIConfigs) {
    this.configs = configs;
  }

  private async requestImagesGenerations({
    baseV1,
    model,
    prompt,
    options,
  }: {
    baseV1: string;
    model: string;
    prompt: string;
    options?: any;
  }) {
    const url = `${baseV1}/images/generations`;

    const extraBody =
      options?.extra_body ?? (options?.size ? { size: options.size } : undefined);

    const payload: any = {
      model,
      prompt,
    };

    if (typeof options?.size === 'string' && options.size) {
      payload.size = options.size;
    }

    if (extraBody && typeof extraBody === 'object') {
      Object.assign(payload, extraBody);
    }

    if (!payload.size) {
      payload.size = '1024x1024';
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.configs.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      let payloadPreview = '';
      try {
        payloadPreview = JSON.stringify(payload, null, 2).slice(0, 1200);
      } catch {
        payloadPreview = String(payload).slice(0, 1200);
      }
      throw new Error(
        `openai images request failed with status: ${resp.status}, body: ${String(errorText).slice(0, 2000)}, payload=${payloadPreview}`
      );
    }

    return resp.json();
  }

  private async requestChatCompletions({
    baseV1,
    model,
    prompt,
    options,
  }: {
    baseV1: string;
    model: string;
    prompt: string;
    options?: any;
  }) {
    const url = `${baseV1}/chat/completions`;

    const imageInput = options?.image_input;
    const extraBody =
      options?.extra_body ?? (options?.size ? { size: options.size } : undefined);

    const { image_input, size, extra_body, ...rest } = options || {};

    const content: any[] = [
      {
        type: 'text',
        text: prompt,
      },
    ];

    if (Array.isArray(imageInput)) {
      for (const url of imageInput) {
        if (typeof url === 'string' && url) {
          content.push({
            type: 'image_url',
            image_url: {
              url,
            },
          });
        }
      }
    }

    const payload: any = {
      model,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      ...rest,
    };

    if (extraBody && typeof extraBody === 'object') {
      Object.assign(payload, extraBody);
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.configs.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      let payloadPreview = '';
      try {
        payloadPreview = JSON.stringify(payload, null, 2).slice(0, 1200);
      } catch {
        payloadPreview = String(payload).slice(0, 1200);
      }
      throw new Error(
        `openai chat request failed with status: ${resp.status}, body: ${String(errorText).slice(0, 2000)}, payload=${payloadPreview}`
      );
    }

    return resp.json();
  }

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

    const base = String(this.configs.baseUrl || '').trim().replace(/\/+$/, '');
    if (!base) {
      throw new Error('openai baseUrl is required');
    }

    const baseV1 = /\/v1$/i.test(base) ? base : `${base}/v1`;

    const imageInput = options?.image_input;

    const data =
      Array.isArray(imageInput) && imageInput.length > 0
        ? await this.requestChatCompletions({
            baseV1,
            model,
            prompt,
            options,
          })
        : await this.requestImagesGenerations({
            baseV1,
            model,
            prompt,
            options,
          });

    const images = await this.extractImagesFromChatResult(data);
    if (!images.length) {
      let preview = '';
      try {
        preview = JSON.stringify(data).slice(0, 2000);
      } catch {
        preview = String(data).slice(0, 2000);
      }

      throw new Error(
        `no image returned by openai images endpoint (preview=${preview})`
      );
    }

    const taskId = nanoid();
    return {
      taskStatus: AITaskStatus.SUCCESS,
      taskId,
      taskInfo: {
        images,
        status: 'success',
        createTime: new Date(),
      },
      taskResult: data,
    };
  }

  private async extractImagesFromChatResult(data: any): Promise<AIImage[]> {
    const images: AIImage[] = [];

    const pushUrl = (url?: string, mimeType?: string) => {
      if (!url || typeof url !== 'string') return;
      images.push({
        id: nanoid(),
        createTime: new Date(),
        imageType: mimeType,
        imageUrl: url,
      });
    };

    const uploadBase64 = async (base64: string, mimeType: string) => {
      try {
        const { getStorageService } = await import('@/shared/services/storage');
        const storageService = await getStorageService();
        const buffer = Buffer.from(base64, 'base64');
        const ext = mimeType.split('/')[1] || 'png';
        const key = `openai/image/${getUuid()}.${ext}`;
        const uploadResult = await storageService.uploadFile({
          body: buffer,
          key,
          contentType: mimeType,
        });
        if (uploadResult?.url) {
          return uploadResult.url;
        }
      } catch {
        // ignore
      }
      return `data:${mimeType};base64,${base64}`;
    };

    const choice = data?.choices?.[0];
    const message = choice?.message;

    if (typeof message?.content === 'string') {
      const content: string = message.content;

      const dataUrlMatch = content.match(
        /data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+/
      );
      if (dataUrlMatch) {
        const match = dataUrlMatch[0].match(
          /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/
        );
        if (match) {
          const mimeType = match[1] || 'image/png';
          const base64 = match[2] || '';
          const url = await uploadBase64(base64, mimeType);
          pushUrl(url, mimeType);
          return images;
        }
      }

      const urlMatch = content.match(/https?:\/\/[^\s)\]]+/);
      if (urlMatch) {
        pushUrl(urlMatch[0]);
        return images;
      }

      const mdImageMatch = content.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/);
      if (mdImageMatch?.[1]) {
        pushUrl(mdImageMatch[1]);
        return images;
      }

      const htmlImgMatch = content.match(
        /<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/i
      );
      if (htmlImgMatch?.[1]) {
        pushUrl(htmlImgMatch[1]);
        return images;
      }
    }

    if (Array.isArray(message?.content)) {
      for (const part of message.content) {
        const maybeUrl = part?.image_url?.url ?? part?.url;
        if (typeof maybeUrl === 'string') {
          pushUrl(maybeUrl);
          continue;
        }

        const inlineData = part?.inlineData ?? part?.inline_data;
        const mimeType = inlineData?.mimeType ?? inlineData?.mime_type;
        const base64 = inlineData?.data;
        if (typeof base64 === 'string' && base64) {
          const url = await uploadBase64(base64, mimeType || 'image/png');
          pushUrl(url, mimeType || 'image/png');
        }
      }
    }

    const dataArray = data?.data;
    if (Array.isArray(dataArray)) {
      for (const item of dataArray) {
        const maybeUrl = item?.url ?? item?.image_url;
        if (typeof maybeUrl === 'string' && maybeUrl) {
          pushUrl(maybeUrl);
          continue;
        }

        const base64 = item?.b64_json;
        if (typeof base64 === 'string' && base64) {
          const url = await uploadBase64(base64, 'image/png');
          pushUrl(url, 'image/png');
        }
      }
    }

    const imagesArray = data?.images ?? data?.data?.images;
    if (Array.isArray(imagesArray)) {
      for (const img of imagesArray) {
        const maybeUrl = img?.url ?? img?.imageUrl ?? img;
        if (typeof maybeUrl === 'string') {
          pushUrl(maybeUrl);
        }
      }
    }

    return images;
  }
}
