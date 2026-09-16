import { apiPost } from '@/apis/request';

import type { ImageUploadApiRequest, ImageUploadApiResponse } from './ImageApi.type';

function imageUpload(
  body: ImageUploadApiRequest,
  timeout?: number
): Promise<ImageUploadApiResponse> {
  return apiPost('/storage/imageUpload', body, timeout ? { timeout } : undefined);
}

export const ImageApi = {
  imageUpload,
};
