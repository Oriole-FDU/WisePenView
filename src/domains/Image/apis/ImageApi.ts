import { executeApiContract } from '@/apis/executeApiContract';

import { ImageUploadApiContract } from './ImageApi.contract';
import type { ImageUploadApiRequest, ImageUploadApiResponse } from './ImageApi.schema';

function imageUpload(
  body: ImageUploadApiRequest,
  timeout?: number
): Promise<ImageUploadApiResponse> {
  return executeApiContract(ImageUploadApiContract, body, timeout ? { timeout } : undefined);
}

export const ImageApi = {
  imageUpload,
};
