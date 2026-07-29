import type { SkillDetail, SkillSummary } from '../entity/skill';

export interface UploadSkillAssetRequest {
  clientId?: string;
  name: string;
  path: string;
  content?: string | Blob;
  size?: number;
  md5?: string;
}

export interface UploadSkillAssetProgress {
  clientId: string;
  progress: number;
}

export interface UploadSkillAssetResult {
  clientId: string;
  name: string;
  path: string;
  assetId?: string;
  objectKey?: string;
  error?: unknown;
}

export interface UploadSkillAssetsOptions {
  concurrency?: number;
  onProgress?: (progress: UploadSkillAssetProgress) => void;
}

export interface MoveSkillAssetRequest {
  assetId: string;
  objectKey?: string;
  name: string;
  path: string;
  content?: string | Blob;
}

export interface MoveSkillAssetResult {
  previousAssetId: string;
  assetId: string;
  objectKey: string;
}

export interface ISkillService {
  getSkillSummaries(groupId?: string): Promise<SkillSummary[]>;
  createSkill(
    title: string,
    name?: string,
    description?: string,
    pathTagId?: string
  ): Promise<string>;
  /** 复制已发布 Skill，后端统一校验 FORK 权限。 */
  forkSkill(params: ForkSkillRequest): Promise<string>;
  getSkillDetail(resourceId: string): Promise<SkillDetail>;
  getSkillVersionFiles(resourceId: string, version: number): Promise<SkillDetail>;
  updateSkillInfo(resourceId: string, name?: string, description?: string): Promise<void>;
  publishVersion(resourceId: string): Promise<void>;
  loadAssetContent(resourceId: string, objectKey: string, targetVersion?: number): Promise<string>;
  loadAssetBlob(resourceId: string, objectKey: string, targetVersion?: number): Promise<Blob>;
  deleteAssets(resourceId: string, draftVersion: number, assetIds: string[]): Promise<void>;
  uploadAssets(
    resourceId: string,
    draftVersion: number,
    assets: UploadSkillAssetRequest[],
    options?: UploadSkillAssetsOptions
  ): Promise<UploadSkillAssetResult[]>;
  moveAssets(
    resourceId: string,
    draftVersion: number,
    assets: MoveSkillAssetRequest[]
  ): Promise<MoveSkillAssetResult[]>;
}

export interface ForkSkillRequest {
  resourceId: string;
  forkedResourceName: string;
  forkedResourceVersion?: number;
}
