import { ResourceServicesMap } from '@/domains/Resource/mapper/ResourceServices.map';
import { normalizeNonNegativeNumber } from '@/utils/normalize/normalizeNumber';
import type {
  AgentAssetResourceTypeApiValue,
  AgentInfoApiResponse,
  AgentSpecApi,
  AgentVersionBundleApiResponse,
  UpdateAgentInfoApiRequest,
  UpdateAgentSpecApiRequest,
} from '../apis/AgentApi.type';
import { AGENT_ASSET_RESOURCE_TYPE_API } from '../apis/AgentApi.type';
import type { AgentDetail, AgentSpec } from '../entity/agent';
import type { SaveAgentDraftRequest } from '../service/index.type';

const AGENT_SPEC_FALLBACK: AgentSpec = {
  systemPrompt: '',
  autoGenerateTitle: true,
  modelPolicy: { defaultModelId: '', defaultProviderId: '', allowRequestOverride: true },
  toolAndSkillPolicy: {
    enableUseTool: true,
    allowToolNames: [],
    denyToolNames: [],
    enableUseSkill: true,
    onDemandSkillIds: [],
    forceEnabledSkillIds: [],
  },
  memoryPolicy: {
    enableChatMemory: true,
    enablePersistenceChatMemory: true,
    enableChatMemorySummary: true,
    highWatermarkRatio: 0.8,
    lowWatermarkRatio: 0.5,
    summaryPrompt: '',
    enableLongTermMemory: false,
    longTermMemoryLimit: 10,
    longTermMemoryScoreThreshold: 0.6,
  },
};

const mapSpec = (spec?: AgentSpecApi | null): AgentSpec => ({
  systemPrompt: spec?.systemPrompt ?? AGENT_SPEC_FALLBACK.systemPrompt,
  autoGenerateTitle: spec?.autoGenerateTitle ?? AGENT_SPEC_FALLBACK.autoGenerateTitle,
  modelPolicy: {
    defaultModelId: spec?.modelPolicy?.defaultModelId ?? '',
    defaultProviderId: spec?.modelPolicy?.defaultProviderId ?? '',
    allowRequestOverride:
      spec?.modelPolicy?.allowRequestOverride ??
      AGENT_SPEC_FALLBACK.modelPolicy.allowRequestOverride,
  },
  toolAndSkillPolicy: {
    enableUseTool:
      spec?.toolAndSkillPolicy?.enableUseTool ??
      AGENT_SPEC_FALLBACK.toolAndSkillPolicy.enableUseTool,
    allowToolNames: [...(spec?.toolAndSkillPolicy?.allowToolNames ?? [])],
    denyToolNames: [...(spec?.toolAndSkillPolicy?.denyToolNames ?? [])],
    enableUseSkill:
      spec?.toolAndSkillPolicy?.enableUseSkill ??
      AGENT_SPEC_FALLBACK.toolAndSkillPolicy.enableUseSkill,
    onDemandSkillIds: [...(spec?.toolAndSkillPolicy?.onDemandSkillIds ?? [])],
    forceEnabledSkillIds: [...(spec?.toolAndSkillPolicy?.forceEnabledSkillIds ?? [])],
  },
  memoryPolicy: {
    enableChatMemory:
      spec?.memoryPolicy?.enableChatMemory ?? AGENT_SPEC_FALLBACK.memoryPolicy.enableChatMemory,
    enablePersistenceChatMemory:
      spec?.memoryPolicy?.enablePersistenceChatMemory ??
      AGENT_SPEC_FALLBACK.memoryPolicy.enablePersistenceChatMemory,
    enableChatMemorySummary:
      spec?.memoryPolicy?.enableChatMemorySummary ??
      AGENT_SPEC_FALLBACK.memoryPolicy.enableChatMemorySummary,
    highWatermarkRatio:
      spec?.memoryPolicy?.highWatermarkRatio ?? AGENT_SPEC_FALLBACK.memoryPolicy.highWatermarkRatio,
    lowWatermarkRatio:
      spec?.memoryPolicy?.lowWatermarkRatio ?? AGENT_SPEC_FALLBACK.memoryPolicy.lowWatermarkRatio,
    summaryPrompt: spec?.memoryPolicy?.summaryPrompt ?? '',
    enableLongTermMemory:
      spec?.memoryPolicy?.enableLongTermMemory ??
      AGENT_SPEC_FALLBACK.memoryPolicy.enableLongTermMemory,
    longTermMemoryLimit:
      spec?.memoryPolicy?.longTermMemoryLimit ??
      AGENT_SPEC_FALLBACK.memoryPolicy.longTermMemoryLimit,
    longTermMemoryScoreThreshold:
      spec?.memoryPolicy?.longTermMemoryScoreThreshold ??
      AGENT_SPEC_FALLBACK.memoryPolicy.longTermMemoryScoreThreshold,
  },
});

const mapAgentSpecToApi = (spec: AgentSpec): AgentSpecApi => ({
  systemPrompt: spec.systemPrompt,
  autoGenerateTitle: spec.autoGenerateTitle,
  modelPolicy: { ...spec.modelPolicy },
  toolAndSkillPolicy: {
    ...spec.toolAndSkillPolicy,
    allowToolNames: [...spec.toolAndSkillPolicy.allowToolNames],
    denyToolNames: [...spec.toolAndSkillPolicy.denyToolNames],
    onDemandSkillIds: [...spec.toolAndSkillPolicy.onDemandSkillIds],
    forceEnabledSkillIds: [...spec.toolAndSkillPolicy.forceEnabledSkillIds],
  },
  memoryPolicy: { ...spec.memoryPolicy },
});

const mapSaveAgentDraftRequests = (
  request: SaveAgentDraftRequest
): {
  info: UpdateAgentInfoApiRequest;
  spec: UpdateAgentSpecApiRequest;
} => ({
  info: {
    resourceId: request.resourceId,
    name: request.name,
    description: request.description,
  },
  spec: {
    resourceId: request.resourceId,
    draftVersion: request.draftVersion,
    spec: mapAgentSpecToApi(request.spec),
  },
});

const resolveAssetResourceType = (name: string): AgentAssetResourceTypeApiValue => {
  const extension = name.split('.').pop()?.toLowerCase();
  const typeMap: Record<string, AgentAssetResourceTypeApiValue> = {
    md: AGENT_ASSET_RESOURCE_TYPE_API.MD,
    py: AGENT_ASSET_RESOURCE_TYPE_API.PYTHON_SCRIPT,
    json: AGENT_ASSET_RESOURCE_TYPE_API.JSON,
    yaml: AGENT_ASSET_RESOURCE_TYPE_API.YAML,
    yml: AGENT_ASSET_RESOURCE_TYPE_API.YAML,
    toml: AGENT_ASSET_RESOURCE_TYPE_API.TOML,
  };
  return typeMap[extension ?? ''] ?? AGENT_ASSET_RESOURCE_TYPE_API.TEXT;
};

const mapAgentDetail = (params: {
  resourceId: string;
  info?: AgentInfoApiResponse;
  bundle?: AgentVersionBundleApiResponse;
  currentUserId: string;
}): AgentDetail => {
  const resource = params.info?.resourceInfo
    ? ResourceServicesMap.mapResourceItemFromApi(params.info.resourceInfo)
    : undefined;
  const publishedVersion = params.info?.agentInfo?.version ?? 0;
  const version = params.bundle?.version ?? publishedVersion + 1;
  return {
    resourceId: params.resourceId,
    title: resource?.resourceName ?? 'Agent',
    name: params.info?.agentInfo?.name ?? '',
    description: params.info?.agentInfo?.description ?? '',
    publishedVersion,
    draftVersion: publishedVersion + 1,
    version,
    status: params.bundle?.status ?? 'DRAFT',
    spec: mapSpec(params.bundle?.spec),
    assets: (params.bundle?.assets ?? []).map((asset) => ({
      id: asset.id ?? '',
      name: asset.name ?? '',
      path: asset.path ?? '/',
      objectKey: asset.objectKey,
      assetResourceType: asset.assetResourceType ?? 'TEXT',
      uploadStatus: asset.uploadStatus ?? 'UPLOADING',
      size: normalizeNonNegativeNumber(asset.size) ?? 0,
    })),
    ownerId: resource?.ownerId,
    isOwner: resource?.ownerId === params.currentUserId,
    currentActions: resource?.currentActions,
  };
};

export const AgentServicesMap = {
  mapAgentDetail,
  mapSaveAgentDraftRequests,
  mapSpec,
  resolveAssetResourceType,
};
