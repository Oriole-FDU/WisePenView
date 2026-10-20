export type VersionStatusApiValue = 'DRAFT' | 'PUBLISHED';
export type AssetUploadStatusApiValue = 'UPLOADING' | 'AVAILABLE';
export type VersionResourceSourceTypeApiValue = 'BY_AGENT' | 'MANUAL';

export interface VersionAssetApiInfo<AssetResourceType extends string = string> {
  id: string;
  name: string;
  path: string;
  objectKey: string | null;
  assetResourceType: AssetResourceType;
  uploadStatus: AssetUploadStatusApiValue;
  size: string | null;
}

export interface VersionBundleApiResponse<AssetResourceType extends string = string> {
  version: number;
  status: VersionStatusApiValue;
  assets: VersionAssetApiInfo<AssetResourceType>[];
  resourceId: string;
}

export interface VersionResourceInfoApiResponse {
  resourceId: string;
  name: string;
  description: string | null;
  version: number;
  sourceType: VersionResourceSourceTypeApiValue;
  updateTime: number;
}

export interface InitUploadAssetApiItem<AssetResourceType extends string = string> {
  name: string;
  path: string;
  assetResourceType: AssetResourceType;
  md5?: string;
  expectedSize?: number;
}

export interface AssetUploadTicketApiResponse {
  assetId: string;
  path: string;
  name: string;
  objectKey: string;
  putUrl: string | null;
  callbackHeader: string | null;
  flashUploaded: boolean;
  domain: string | null;
}

export interface InitUploadAssetsApiResponse {
  resourceId: string;
  version: number;
  assetUploadTickets: AssetUploadTicketApiResponse[];
}
