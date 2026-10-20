import type { Nullable } from '@/apis/api.type';

export type VersionStatusApiValue = 'DRAFT' | 'PUBLISHED';
export type AssetUploadStatusApiValue = 'UPLOADING' | 'AVAILABLE';
export type VersionResourceSourceTypeApiValue = 'BY_AGENT' | 'MANUAL';

export interface VersionAssetApiInfo<AssetResourceType extends string = string> {
  id: string;
  name: string;
  path: string;
  objectKey: Nullable<string>;
  assetResourceType: AssetResourceType;
  uploadStatus: AssetUploadStatusApiValue;
  size: Nullable<string>;
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
  description: Nullable<string>;
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
  putUrl: Nullable<string>;
  callbackHeader: Nullable<string>;
  flashUploaded: boolean;
  domain: Nullable<string>;
}

export interface InitUploadAssetsApiResponse {
  resourceId: string;
  version: number;
  assetUploadTickets: AssetUploadTicketApiResponse[];
}
