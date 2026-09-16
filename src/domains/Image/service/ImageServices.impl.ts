import { ImageApi } from '@domain-apis';
import { ImageServicesMap } from '../mapper/ImageServices.map';
import type { IImageService, ImageUploadRequest, ImageUploadResult } from './index.type';
import { assertImageProxyUploadLimit } from './index.type';

/** 图床上传可能略慢于普通 JSON 接口 */
const IMAGE_UPLOAD_TIMEOUT_MS = 60_000;

const uploadImage = async (params: ImageUploadRequest): Promise<ImageUploadResult> => {
  assertImageProxyUploadLimit(params.file);

  const formData = ImageServicesMap.mapImageUploadRequest(params);
  const record = await ImageApi.imageUpload(formData, IMAGE_UPLOAD_TIMEOUT_MS);
  return ImageServicesMap.mapImageUploadFromApi(record);
};

export const createImageServices = (): IImageService => ({
  uploadImage,
});
