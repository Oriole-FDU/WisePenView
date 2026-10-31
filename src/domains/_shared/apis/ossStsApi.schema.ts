import { z } from 'zod';

import { EpochMillisSchema, NonEmptyStringSchema } from '@/apis/schema';

/** Java 文件服务返回的 STS 临时凭证。 */
export const OssStsTokenApiSchema = z.object({
  accessKeyId: NonEmptyStringSchema,
  accessKeySecret: NonEmptyStringSchema,
  securityToken: NonEmptyStringSchema,
  bucket: NonEmptyStringSchema,
  region: NonEmptyStringSchema,
  endpoint: NonEmptyStringSchema.optional(),
  expiration: EpochMillisSchema,
});

export type OssStsTokenApi = z.infer<typeof OssStsTokenApiSchema>;
