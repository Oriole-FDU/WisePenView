import type { OssPresignedPutParams } from '@/domains/_shared/apis/ossPresignedPut';
import { createError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { OssReadClient } from '../apis/ossClient';

export const mockObjects = new Map<string, Blob>();
export const mockUploadCallbacks = new Map<string, () => void>();
export const createOssClient = (): OssReadClient => ({
  async get(objectKey) {
    const content = mockObjects.get(objectKey);
    if (!content)
      throw createError({ code: FRONTEND_CLIENT_ERROR.SKILL_CONTENT_NOT_LOADED, source: 'client' });
    return { content };
  },
});
export async function putOssPresignedUrl({
  putUrl,
  body,
  onProgress,
}: OssPresignedPutParams): Promise<void> {
  mockObjects.set(putUrl, body);
  mockUploadCallbacks.get(putUrl)?.();
  onProgress?.(100);
}
