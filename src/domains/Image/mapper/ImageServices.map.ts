import { normalizeNonNegativeNumber } from '@/utils/normalize/normalizeNumber';

import type { ImageUploadApiRequest, ImageUploadApiResponse } from '../apis/ImageApi.type';
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

const mapImageUploadFromApi = (record: ImageUploadApiResponse): ImageUploadResult => {
  const size = normalizeNonNegativeNumber(record.size);
  return {
    record: {
      fileId: record.fileId,
      domain: record.domain,
      objectKey: record.objectKey,
      ...(record.md5 == null ? {} : { md5: record.md5 }),
      ...(size == null ? {} : { size }),
    },
    publicUrl: buildImagePublicUrl(record),
  };
};

export const ImageServicesMap = {
  mapImageUploadRequest,
  mapImageUploadFromApi,
};
