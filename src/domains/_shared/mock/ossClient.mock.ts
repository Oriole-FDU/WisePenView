import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import type { OssPresignedPutParams } from '@/utils/oss/ossPresignedPut';
import type { OssReadClient } from '../apis/ossClient';

export const mockObjects = new Map<string, Blob>();
export const createOssClient = (): OssReadClient => ({
  async get(objectKey) {
    const content = mockObjects.get(objectKey);
    if (!content) throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_CONTENT_NOT_LOADED);
    return { content };
  },
});
export async function putOssPresignedUrl({
  putUrl,
  body,
  onProgress,
}: OssPresignedPutParams): Promise<void> {
  mockObjects.set(putUrl, body);
  onProgress?.(100);
}
