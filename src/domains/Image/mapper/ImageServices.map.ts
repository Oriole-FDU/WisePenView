import {
  assertApiRecord,
  invalidApiResponse,
  optionalApiNumber,
  optionalApiString,
} from '@/apis/runtimeContract';

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
  assertApiRecord(record, '图片上传响应契约无效');
  if (typeof record.domain !== 'string' || typeof record.objectKey !== 'string')
    invalidApiResponse('图片上传响应契约无效');
  const mapped = {
    domain: record.domain,
    objectKey: record.objectKey,
    fileId: optionalApiNumber(record.fileId),
    md5: optionalApiString(record.md5),
    size: optionalApiNumber(record.size),
  };
  return { record: mapped, publicUrl: buildImagePublicUrl(mapped) };
};

export const ImageServicesMap = {
  mapImageUploadRequest,
  mapImageUploadFromApi,
};
