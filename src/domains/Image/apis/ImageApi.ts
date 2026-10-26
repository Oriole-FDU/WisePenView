import { apiPostUnchecked } from '@/apis/request';

import type { ImageUploadApiRequest, ImageUploadApiResponse } from './ImageApi.type';

function imageUpload(
  body: ImageUploadApiRequest,
  timeout?: number
): Promise<ImageUploadApiResponse> {
  return apiPostUnchecked('/storage/imageUpload', body, timeout ? { timeout } : undefined);
}

export const ImageApi = {
  imageUpload,
};
