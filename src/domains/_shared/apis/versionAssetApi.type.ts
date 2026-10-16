import type { JavaLongApiValue } from '@/apis/api.type';

export type VersionStatusApiValue = 'DRAFT' | 'PUBLISHED';
export type AssetUploadStatusApiValue = 'UPLOADING' | 'AVAILABLE';

export interface VersionAssetApiInfo<AssetResourceType extends string = string> {
  id?: string;
  name?: string;
  path?: string;
  objectKey?: string;
  assetResourceType?: AssetResourceType;
  uploadStatus?: AssetUploadStatusApiValue;
  size?: JavaLongApiValue;
}

export interface VersionBundleApiResponse<AssetResourceType extends string = string> {
  version?: number;
  status?: VersionStatusApiValue;
  assets?: VersionAssetApiInfo<AssetResourceType>[];
  resourceId?: string;
}

export interface VersionResourceInfoApiResponse {
  name?: string;
  description?: string;
  version?: number;
  sourceType?: string;
}

export interface InitUploadAssetApiItem<AssetResourceType extends string = string> {
  name: string;
  path: string;
  assetResourceType: AssetResourceType;
  md5?: string;
  expectedSize?: number;
}

export interface AssetUploadTicketApiResponse {
  assetId?: string;
  path?: string;
  name?: string;
  objectKey?: string;
  putUrl?: string;
  callbackHeader?: string;
  flashUploaded?: boolean;
}

export interface InitUploadAssetsApiResponse {
  resourceId?: string;
  version?: number;
  assetUploadTickets?: AssetUploadTicketApiResponse[];
}

export interface CancelUploadAssetsApiRequest {
  resourceId: string;
  draftVersion: number;
  objectKeys: string[];
}
