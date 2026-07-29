import type { ResourceAction } from '@/domains/Resource';

export type AgentAssetResourceType = 'MD' | 'PYTHON_SCRIPT' | 'TEXT' | 'JSON' | 'YAML' | 'TOML';

export type AgentAssetUploadStatus = 'UPLOADING' | 'AVAILABLE';

export interface AgentModelPolicy {
  defaultModelId: string;
  defaultProviderId: string;
  allowRequestOverride: boolean;
}

export interface AgentToolAndSkillPolicy {
  enableUseTool: boolean;
  allowToolNames: string[];
  denyToolNames: string[];
  enableUseSkill: boolean;
  onDemandSkillIds: string[];
  forceEnabledSkillIds: string[];
}

export interface AgentMemoryPolicy {
  enableChatMemory: boolean;
  enablePersistenceChatMemory: boolean;
  enableChatMemorySummary: boolean;
  highWatermarkRatio: number;
  lowWatermarkRatio: number;
  summaryPrompt: string;
  enableLongTermMemory: boolean;
  longTermMemoryLimit: number;
  longTermMemoryScoreThreshold: number;
}

export interface AgentSpec {
  systemPrompt: string;
  autoGenerateTitle: boolean;
  modelPolicy: AgentModelPolicy;
  toolAndSkillPolicy: AgentToolAndSkillPolicy;
  memoryPolicy: AgentMemoryPolicy;
}

export interface AgentAsset {
  id: string;
  name: string;
  path: string;
  objectKey?: string;
  assetResourceType: AgentAssetResourceType;
  uploadStatus: AgentAssetUploadStatus;
  size: number;
}

export interface AgentDetail {
  resourceId: string;
  title: string;
  name: string;
  description: string;
  publishedVersion: number;
  draftVersion: number;
  version: number;
  status: 'DRAFT' | 'PUBLISHED';
  spec: AgentSpec;
  assets: AgentAsset[];
  ownerId?: string;
  isOwner: boolean;
  currentActions?: ResourceAction[] | null;
}
