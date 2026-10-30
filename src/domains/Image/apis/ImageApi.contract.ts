import { defineApiContract } from '@/apis/contract';

import { ImageUploadApiRequestSchema, ImageUploadApiResponseSchema } from './ImageApi.schema';

export const ImageUploadApiContract = defineApiContract({
  name: 'ImageUploadApi',
  method: 'POST',
  endpoint: '/storage/imageUpload',
  requestPlacement: 'body',
  transport: 'multipart',
  request: ImageUploadApiRequestSchema,
  response: ImageUploadApiResponseSchema,
});
