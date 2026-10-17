import {
  assertApiRecord,
  invalidApiResponse,
  isFiniteNumber,
  isRecord,
} from '@/apis/runtimeContract';

import type {
  InitUploadAssetsApiResponse,
  VersionBundleApiResponse,
  VersionResourceInfoApiResponse,
} from '../apis/versionAssetApi.type';

const assetTypes = ['MD', 'PYTHON_SCRIPT', 'TEXT', 'JSON', 'YAML', 'TOML'];
const nonNegativeInteger = (value: unknown): boolean =>
  Number.isSafeInteger(value) && Number(value) >= 0;

export function validateVersionBundle(data: VersionBundleApiResponse): void {
  const record = assertApiRecord(data, '版本包契约无效');
  if (
    !nonNegativeInteger(record.version) ||
    !['DRAFT', 'PUBLISHED'].includes(String(record.status)) ||
    !Array.isArray(record.assets)
  )
    invalidApiResponse('版本包契约无效');
  for (const asset of data.assets ?? []) {
    if (
      !isRecord(asset) ||
      !['id', 'name', 'path'].every((key) => typeof asset[key] === 'string') ||
      !assetTypes.includes(String(asset.assetResourceType)) ||
      !['UPLOADING', 'AVAILABLE'].includes(String(asset.uploadStatus))
    )
      invalidApiResponse('版本资产契约无效');
  }
}

export function mapVersionResourceInfo(
  data: VersionResourceInfoApiResponse
): VersionResourceInfoApiResponse {
  const record = assertApiRecord(data, '版本资源信息契约无效');
  if (!nonNegativeInteger(record.version)) invalidApiResponse('版本资源信息契约无效');
  return {
    version: data.version,
    name: typeof data.name === 'string' ? data.name : undefined,
    description: typeof data.description === 'string' ? data.description : undefined,
    sourceType: typeof data.sourceType === 'string' ? data.sourceType : undefined,
  };
}

export function mapUploadTickets(
  data: InitUploadAssetsApiResponse | undefined
): NonNullable<InitUploadAssetsApiResponse['assetUploadTickets']> {
  const record = assertApiRecord(data, '资产上传回执契约无效');
  if (
    typeof record.resourceId !== 'string' ||
    !isFiniteNumber(record.version) ||
    !Array.isArray(record.assetUploadTickets)
  )
    invalidApiResponse('资产上传回执契约无效');
  return (data?.assetUploadTickets ?? []).map((ticket) => {
    if (
      !isRecord(ticket) ||
      typeof ticket.assetId !== 'string' ||
      !ticket.assetId ||
      typeof ticket.objectKey !== 'string' ||
      !ticket.objectKey
    )
      invalidApiResponse('资产上传回执契约无效');
    if (
      ticket.flashUploaded !== true &&
      (typeof ticket.putUrl !== 'string' ||
        !ticket.putUrl ||
        typeof ticket.callbackHeader !== 'string' ||
        !ticket.callbackHeader)
    )
      invalidApiResponse('资产上传凭据契约无效');
    return {
      assetId: ticket.assetId,
      objectKey: ticket.objectKey,
      name: typeof ticket.name === 'string' ? ticket.name : undefined,
      path: typeof ticket.path === 'string' ? ticket.path : undefined,
      putUrl: typeof ticket.putUrl === 'string' ? ticket.putUrl : undefined,
      callbackHeader: typeof ticket.callbackHeader === 'string' ? ticket.callbackHeader : undefined,
      flashUploaded: typeof ticket.flashUploaded === 'boolean' ? ticket.flashUploaded : undefined,
    };
  });
}
