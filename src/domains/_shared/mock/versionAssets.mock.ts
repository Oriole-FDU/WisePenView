import { WisePenError } from '@/utils/error';

import type {
  InitUploadAssetApiItem,
  VersionAssetApiInfo,
  VersionBundleApiResponse,
} from '../apis/versionAssetApi.type';
import { mockObjects, mockUploadCallbacks } from './ossClient.mock';

const pendingUploads = new Map<
  string,
  { target: VersionBundleApiResponse; asset: VersionAssetApiInfo }
>();

export function initMockVersionAssets(
  target: VersionBundleApiResponse,
  assets: InitUploadAssetApiItem[],
  prefix: string
) {
  return assets.map((request) => {
    const sameFile = (asset: VersionAssetApiInfo) =>
      asset.path === request.path && asset.name === request.name;
    const previous = [...pendingUploads].find(
      ([, upload]) => upload.target === target && sameFile(upload.asset)
    );
    const existing = target.assets?.find(sameFile) ?? previous?.[1].asset;
    if (previous) cancelMockVersionUploads(target, [previous[0]]);
    const assetId = existing?.id ?? `mock-asset-${crypto.randomUUID()}`;
    const objectKey = `${prefix}/${crypto.randomUUID()}`;
    const asset: VersionAssetApiInfo = {
      ...request,
      id: assetId,
      objectKey,
      size: request.expectedSize?.toString(),
      uploadStatus: 'AVAILABLE',
    };
    pendingUploads.set(objectKey, { target, asset });
    mockUploadCallbacks.set(objectKey, () => {
      target.assets = [...(target.assets ?? []).filter((item) => !sameFile(item)), asset];
      pendingUploads.delete(objectKey);
      mockUploadCallbacks.delete(objectKey);
    });
    return { assetId, objectKey, putUrl: objectKey, callbackHeader: 'mock' };
  });
}

export function cancelMockVersionUploads(target: VersionBundleApiResponse, objectKeys: string[]) {
  for (const key of objectKeys) {
    if (pendingUploads.get(key)?.target !== target) continue;
    pendingUploads.delete(key);
    mockUploadCallbacks.delete(key);
    mockObjects.delete(key);
  }
}

export function deleteMockVersionAssets(target: VersionBundleApiResponse, assetIds: string[]) {
  target.assets = target.assets?.filter((asset) => !assetIds.includes(asset.id ?? ''));
  cancelMockVersionUploads(
    target,
    [...pendingUploads]
      .filter(([, upload]) => upload.target === target && assetIds.includes(upload.asset.id ?? ''))
      .map(([key]) => key)
  );
}

export function assertMockVersionUploadsComplete(target: VersionBundleApiResponse) {
  if ([...pendingUploads.values()].some((upload) => upload.target === target)) {
    // 与后端 AIResourceError.AI_RESOURCE_ASSET_NOT_READY 保持一致。
    throw new WisePenError({ code: 9321, source: 'api', serverMsg: 'AI资源的Asset未就绪' });
  }
}
