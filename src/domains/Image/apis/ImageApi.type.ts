export type ImageUploadApiRequest = FormData;

export interface ImageUploadApiResponse {
  fileId: string;
  domain: string;
  objectKey: string;
  md5: string | null;
  size: string | null;
}
