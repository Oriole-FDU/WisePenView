import type {
  AssetResourceTypeApiValue,
  VersionAssetInfoApi,
  VersionBundleApi,
} from './versionAssetApi.schema';

export type VersionAssetApiInfo<
  AssetResourceType extends AssetResourceTypeApiValue = AssetResourceTypeApiValue,
> = Omit<VersionAssetInfoApi, 'assetResourceType'> & {
  assetResourceType: AssetResourceType;
};

export type VersionBundleApiResponse<
  AssetResourceType extends AssetResourceTypeApiValue = AssetResourceTypeApiValue,
> = Omit<VersionBundleApi, 'assets'> & {
  assets: VersionAssetApiInfo<AssetResourceType>[];
};

export type {
  AssetUploadTicketApiResponse,
  CancelUploadAssetsApiRequest,
  InitUploadAssetApiItem,
  InitUploadAssetsApiResponse,
  AIResourceInfoApi as VersionResourceInfoApiResponse,
} from './versionAssetApi.schema';
