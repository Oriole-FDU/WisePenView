import type { Nullable } from '@/apis/api.type';

export type ImageUploadApiRequest = FormData;

export interface ImageUploadApiResponse {
  fileId: string;
  domain: string;
  objectKey: string;
  md5: Nullable<string>;
  size: Nullable<string>;
}
