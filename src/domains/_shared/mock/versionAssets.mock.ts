import { WisePenError } from '@/utils/error';

import type {
  CancelUploadAssetsApiRequest,
  InitUploadAssetApiItem,
  VersionBundleApi,
} from '../apis/versionAssetApi.schema';
import { mockObjects, mockUploadCallbacks } from './ossClient.mock';

export function initMockVersionAssets(
  target: VersionBundleApi,
  assets: InitUploadAssetApiItem[],
  prefix: string
) {
  return assets.map((request) => {
    target.assets ??= [];
    let asset = target.assets.find(
      (item) => item.path === request.path && item.name === request.name
    );
    if (!asset) {
      asset = {
        id: `mock-asset-${crypto.randomUUID()}`,
        path: request.path,
        name: request.name,
        objectKey: null,
        assetResourceType: request.assetResourceType,
        uploadStatus: 'UPLOADING',
        size: null,
        pendingUpload: null,
      };
      target.assets.push(asset);
    }
    if (asset.pendingUpload?.objectKey) {
      mockUploadCallbacks.delete(asset.pendingUpload.objectKey);
    }
    const objectKey = `${prefix}/${crypto.randomUUID()}`;
    asset.pendingUpload = {
      objectKey,
      assetResourceType: request.assetResourceType,
      expectedSize: String(request.expectedSize ?? mockObjects.get(objectKey)?.size ?? 0),
      createTime: Date.now(),
    };
    asset.uploadStatus = 'UPLOADING';
    mockUploadCallbacks.set(objectKey, () => {
      mockUploadCallbacks.delete(objectKey);
      // 取消、删除或同名重试后，迟到回调不能提交旧候选。
      if (!target.assets?.includes(asset) || asset.pendingUpload?.objectKey !== objectKey) return;
      asset.objectKey = objectKey;
      asset.assetResourceType = request.assetResourceType;
      asset.size = mockObjects.get(objectKey)?.size.toString() ?? null;
      asset.uploadStatus = 'AVAILABLE';
      asset.pendingUpload = null;
    });
    return {
      assetId: asset.id,
      path: request.path,
      name: request.name,
      objectKey,
      putUrl: objectKey,
      callbackHeader: 'mock',
      flashUploaded: false,
    };
  });
}

export function cancelMockVersionUploads(
  target: VersionBundleApi,
  uploads: CancelUploadAssetsApiRequest['uploads']
) {
  for (const { assetId, objectKey } of uploads) {
    const asset = target.assets?.find(
      (item) => item.id === assetId && item.pendingUpload?.objectKey === objectKey
    );
    if (!asset) continue;
    if (asset.objectKey) {
      asset.pendingUpload = null;
      asset.uploadStatus = 'AVAILABLE';
    } else {
      target.assets = target.assets?.filter((item) => item !== asset);
    }
    mockUploadCallbacks.delete(objectKey);
    mockObjects.delete(objectKey);
  }
}

export function deleteMockVersionAssets(target: VersionBundleApi, assetIds: string[]) {
  for (const asset of target.assets ?? []) {
    if (assetIds.includes(asset.id ?? '') && asset.pendingUpload?.objectKey) {
      mockUploadCallbacks.delete(asset.pendingUpload.objectKey);
      mockObjects.delete(asset.pendingUpload.objectKey);
    }
  }
  target.assets = target.assets?.filter((asset) => !assetIds.includes(asset.id ?? ''));
}

export function assertMockVersionUploadsComplete(target: VersionBundleApi) {
  if (
    target.assets?.some(
      (asset) => !asset.objectKey || asset.uploadStatus !== 'AVAILABLE' || asset.pendingUpload
    )
  ) {
    // 与后端 AIResourceError.AI_RESOURCE_ASSET_NOT_READY 保持一致。
    throw new WisePenError({ code: 9321, source: 'api', serverMsg: 'AI资源的Asset未就绪' });
  }
}
