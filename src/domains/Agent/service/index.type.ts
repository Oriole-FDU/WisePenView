import type { AgentDetail, AgentSpec } from '../entity/agent';

export interface SaveAgentDraftRequest {
  resourceId: string;
  draftVersion: number;
  name?: string;
  description?: string;
  spec: AgentSpec;
}

export interface UploadAgentAssetRequest {
  file: File;
  path?: string;
}

export interface IAgentService {
  createAgent(
    title: string,
    name?: string,
    description?: string,
    pathTagId?: string
  ): Promise<string>;
  getAgentDetail(resourceId: string, version?: number): Promise<AgentDetail>;
  saveAgentDraft(request: SaveAgentDraftRequest): Promise<void>;
  publishVersion(resourceId: string): Promise<void>;
  uploadAsset(
    resourceId: string,
    draftVersion: number,
    request: UploadAgentAssetRequest
  ): Promise<void>;
  deleteAssets(resourceId: string, draftVersion: number, assetIds: string[]): Promise<void>;
}
