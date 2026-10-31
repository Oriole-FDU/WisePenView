import { z } from 'zod';

import { JavaLongIdSchema, JavaLongStringSchema, NonEmptyStringSchema } from '@/apis/schema';

export const ImageUploadApiRequestSchema = z.custom<FormData>(
  (value) => value instanceof FormData,
  { message: '图片上传请求必须是 FormData' }
);

export const ImageUploadApiResponseSchema = z.object({
  fileId: JavaLongIdSchema,
  domain: NonEmptyStringSchema,
  objectKey: NonEmptyStringSchema,
  md5: NonEmptyStringSchema,
  size: JavaLongStringSchema,
});

export type ImageUploadApiRequest = z.infer<typeof ImageUploadApiRequestSchema>;
export type ImageUploadApiResponse = z.infer<typeof ImageUploadApiResponseSchema>;
