import type { ResourceItemApiResponse } from '@/domains/Resource/apis/ResourceApi.type';
import type {
  InitUploadAssetApiItem,
  VersionAssetApiInfo,
  VersionBundleApiResponse,
  VersionResourceInfoApiResponse,
} from '@/domains/_shared/apis/versionAssetApi.type';

export const AssetResourceTypeEnum = {
  MD: 'MD',
  PYTHON_SCRIPT: 'PYTHON_SCRIPT',
  TEXT: 'TEXT',
  JSON: 'JSON',
  YAML: 'YAML',
  TOML: 'TOML',
} as const;

export type AssetResourceTypeEnum =
  (typeof AssetResourceTypeEnum)[keyof typeof AssetResourceTypeEnum];

export type SkillAssetApiInfo = VersionAssetApiInfo<AssetResourceTypeEnum>;

export interface SkillInfoApiResponse {
  resourceInfo?: ResourceItemApiResponse;
  skillInfo?: VersionResourceInfoApiResponse;
}

export type SkillVersionBundleApiResponse = VersionBundleApiResponse<AssetResourceTypeEnum>;

export interface CreateSkillApiRequest {
  title: string;
  name?: string;
  description?: string;
  pathTagId?: string;
  sourceType?: string;
}

export interface ForkSkillApiRequest {
  resourceId: string;
  forkedResourceVersion?: number;
  forkedResourceName: string;
}

export interface GetSkillInfoApiRequest {
  resourceId: string;
  targetVersion?: number;
}

export interface GetSkillVersionBundleInfoApiRequest {
  resourceId: string;
  version: number;
}

export interface GetSkillAssetStsTokenApiRequest {
  resourceId: string;
  targetVersion?: number;
}

export interface UpdateSkillInfoApiRequest {
  resourceId?: string;
  name?: string;
  description?: string;
}

export interface InitUploadSkillAssetsApiRequest {
  resourceId: string;
  draftVersion: number;
  assets: InitUploadAssetApiItem<AssetResourceTypeEnum>[];
}

export interface DeleteSkillAssetsApiRequest {
  resourceId: string;
  draftVersion: number;
  assetIds: string[];
}

export interface PublishSkillVersionApiRequest {
  resourceId: string;
}
