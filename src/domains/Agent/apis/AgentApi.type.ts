import type { ResourceItemApiResponse } from '@/domains/Resource/apis/ResourceApi.type';
import type {
  InitUploadAssetApiItem,
  VersionBundleApiResponse,
  VersionResourceInfoApiResponse,
} from '@/domains/_shared/apis/versionAssetApi.type';

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
  defaultModelId?: string | null;
  defaultProviderId?: string | null;
  allowRequestOverride?: boolean | null;
}

export interface AgentToolAndSkillPolicyApi {
  enableUseTool?: boolean | null;
  allowToolNames?: string[] | null;
  denyToolNames?: string[] | null;
  enableUseSkill?: boolean | null;
  onDemandSkillIds?: string[] | null;
  forceEnabledSkillIds?: string[] | null;
}

export interface AgentMemoryPolicyApi {
  enableChatMemory?: boolean | null;
  enablePersistenceChatMemory?: boolean | null;
  enableChatMemorySummary?: boolean | null;
  highWatermarkRatio?: number | null;
  lowWatermarkRatio?: number | null;
  summaryPrompt?: string | null;
  enableLongTermMemory?: boolean | null;
  longTermMemoryLimit?: number | null;
  longTermMemoryScoreThreshold?: number | null;
}

export interface AgentSpecApi {
  systemPrompt?: string | null;
  autoGenerateTitle?: boolean | null;
  modelPolicy?: AgentModelPolicyApi | null;
  toolAndSkillPolicy?: AgentToolAndSkillPolicyApi | null;
  memoryPolicy?: AgentMemoryPolicyApi | null;
}

export interface AgentInfoApiResponse {
  resourceInfo?: ResourceItemApiResponse;
  agentInfo?: VersionResourceInfoApiResponse;
}

export type AgentVersionBundleApiResponse =
  VersionBundleApiResponse<AgentAssetResourceTypeApiValue> & {
    spec?: AgentSpecApi | null;
  };

export interface CreateAgentApiRequest {
  title: string;
  name?: string;
  description?: string;
  pathTagId?: string;
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
