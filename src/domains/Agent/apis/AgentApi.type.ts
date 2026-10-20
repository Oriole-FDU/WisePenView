import type { Nullable } from '@/apis/api.type';
import type {
  InitUploadAssetApiItem,
  VersionBundleApiResponse,
  VersionResourceInfoApiResponse,
} from '@/domains/_shared/apis/versionAssetApi.type';
import type { ResourceItemApiResponse } from '@/domains/Resource/apis/ResourceApi.type';

export const AGENT_ASSET_RESOURCE_TYPE_API = {
  MD: 'MD',
  PYTHON_SCRIPT: 'PYTHON_SCRIPT',
  TEXT: 'TEXT',
  JSON: 'JSON',
  YAML: 'YAML',
  TOML: 'TOML',
} as const;

export type AgentAssetResourceTypeApiValue =
  (typeof AGENT_ASSET_RESOURCE_TYPE_API)[keyof typeof AGENT_ASSET_RESOURCE_TYPE_API];

export interface AgentModelPolicyApi {
  defaultModelId: Nullable<string>;
  defaultProviderId: Nullable<string>;
  allowRequestOverride: Nullable<boolean>;
}

export interface AgentToolAndSkillPolicyApi {
  enableUseTool: Nullable<boolean>;
  toolSelectionDefaultEnabled: Nullable<boolean>;
  toolSelectionOverrides: Nullable<Record<string, boolean>>;
  enableUseSkill: Nullable<boolean>;
  onDemandSkillIds: Nullable<string[]>;
  skillMatchTopK: Nullable<number>;
}

export interface AgentMemoryPolicyApi {
  enableChatMemory: Nullable<boolean>;
  enablePersistenceChatMemory: Nullable<boolean>;
  enableChatMemorySummary: Nullable<boolean>;
  highWatermarkRatio: Nullable<number>;
  lowWatermarkRatio: Nullable<number>;
  summaryPrompt: Nullable<string>;
  enableLongTermMemory: Nullable<boolean>;
  longTermMemoryLimit: Nullable<number>;
  longTermMemoryScoreThreshold: Nullable<number>;
}

export interface AgentSpecApi {
  systemPrompt: Nullable<string>;
  autoGenerateTitle: Nullable<boolean>;
  modelPolicy: Nullable<AgentModelPolicyApi>;
  toolAndSkillPolicy: Nullable<AgentToolAndSkillPolicyApi>;
  memoryPolicy: Nullable<AgentMemoryPolicyApi>;
}

export interface AgentInfoApiResponse {
  resourceInfo: ResourceItemApiResponse;
  agentInfo: VersionResourceInfoApiResponse;
}

export type AgentVersionBundleApiResponse =
  VersionBundleApiResponse<AgentAssetResourceTypeApiValue> & {
    spec: Nullable<AgentSpecApi>;
  };

export interface CreateAgentApiRequest {
  title: string;
  name?: string;
  description?: string;
  mountTargetTagId?: string;
  sourceType?: string;
}

export interface UpdateAgentInfoApiRequest {
  resourceId: string;
  name?: string;
  description?: string;
}

export interface UpdateAgentSpecApiRequest {
  resourceId: string;
  draftVersion: number;
  spec: AgentSpecApi;
}

export interface InitUploadAgentAssetsApiRequest {
  resourceId: string;
  draftVersion: number;
  assets: InitUploadAssetApiItem<AgentAssetResourceTypeApiValue>[];
}

export interface DeleteAgentAssetsApiRequest {
  resourceId: string;
  draftVersion: number;
  assetIds: string[];
}
