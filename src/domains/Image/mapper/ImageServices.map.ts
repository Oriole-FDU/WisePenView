import { normalizeNonNegativeNumber } from '@/utils/normalize/normalizeNumber';

import type { ImageUploadApiRequest, ImageUploadApiResponse } from '../apis/ImageApi.schema';
import type { ImageUploadRequest, ImageUploadResult } from '../service/index.type';
import { buildImagePublicUrl } from '../service/index.type';

const mapImageUploadRequest = (params: ImageUploadRequest): ImageUploadApiRequest => {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('scene', params.scene);
  const bizTag = params.bizTag;
  if (bizTag !== undefined && bizTag !== '') {
    formData.append('bizTag', bizTag);
  }
  return formData;
};

const mapImageUploadFromApi = (record: ImageUploadApiResponse): ImageUploadResult => ({
  record: {
    ...record,
    size: normalizeNonNegativeNumber(record.size) ?? 0,
  },
  publicUrl: buildImagePublicUrl(record),
});

export const ImageServicesMap = {
  mapImageUploadRequest,
  mapImageUploadFromApi,
};
