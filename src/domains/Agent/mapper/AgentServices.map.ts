import {
  ASSET_RESOURCE_TYPE,
  type AssetResourceType,
} from '@/domains/_shared/apis/versionAsset.enum';
import { ResourceServicesMap } from '@/domains/Resource/mapper/ResourceServices.map';
import { normalizeNonNegativeNumber } from '@/utils/normalize/normalizeNumber';

import type {
  AgentInfoApiResponse,
  AgentSpecApi,
  AgentSpecRequest,
  AgentVersionBundleApiResponse,
  UpdateAgentInfoApiRequest,
  UpdateAgentSpecApiRequest,
} from '../apis/AgentApi.schema';
import type { AgentDetail, AgentSpec } from '../entity/agent';
import type { SaveAgentDraftRequest } from '../service/index.type';

const AGENT_SPEC_FALLBACK: AgentSpec = {
  systemPrompt: '',
  autoGenerateTitle: true,
  modelPolicy: { defaultModelId: '', defaultProviderId: '', allowRequestOverride: true },
  toolAndSkillPolicy: {
    enableUseTool: true,
    toolSelectionDefaultEnabled: true,
    toolSelectionOverrides: {},
    enableUseSkill: true,
    onDemandSkillIds: [],
    skillMatchTopK: 10,
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
    toolSelectionDefaultEnabled:
      spec?.toolAndSkillPolicy?.toolSelectionDefaultEnabled ??
      AGENT_SPEC_FALLBACK.toolAndSkillPolicy.toolSelectionDefaultEnabled,
    toolSelectionOverrides: { ...(spec?.toolAndSkillPolicy?.toolSelectionOverrides ?? {}) },
    enableUseSkill:
      spec?.toolAndSkillPolicy?.enableUseSkill ??
      AGENT_SPEC_FALLBACK.toolAndSkillPolicy.enableUseSkill,
    onDemandSkillIds: [...(spec?.toolAndSkillPolicy?.onDemandSkillIds ?? [])],
    skillMatchTopK:
      spec?.toolAndSkillPolicy?.skillMatchTopK ??
      AGENT_SPEC_FALLBACK.toolAndSkillPolicy.skillMatchTopK,
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

const mapAgentSpecToApi = (spec: AgentSpec): AgentSpecRequest => ({
  systemPrompt: spec.systemPrompt,
  autoGenerateTitle: spec.autoGenerateTitle,
  modelPolicy: { ...spec.modelPolicy },
  toolAndSkillPolicy: {
    ...spec.toolAndSkillPolicy,
    toolSelectionOverrides: { ...spec.toolAndSkillPolicy.toolSelectionOverrides },
    onDemandSkillIds: [...spec.toolAndSkillPolicy.onDemandSkillIds],
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

const resolveAssetResourceType = (name: string): AssetResourceType => {
  const extension = name.split('.').pop()?.toLowerCase();
  const typeMap: Record<string, AssetResourceType> = {
    md: ASSET_RESOURCE_TYPE.MD,
    py: ASSET_RESOURCE_TYPE.PYTHON_SCRIPT,
    json: ASSET_RESOURCE_TYPE.JSON,
    yaml: ASSET_RESOURCE_TYPE.YAML,
    yml: ASSET_RESOURCE_TYPE.YAML,
    toml: ASSET_RESOURCE_TYPE.TOML,
  };
  return typeMap[extension ?? ''] ?? ASSET_RESOURCE_TYPE.TEXT;
};

const mapAgentDetail = (params: {
  resourceId: string;
  info?: AgentInfoApiResponse;
  bundle?: AgentVersionBundleApiResponse;
}): AgentDetail => {
  const resource = params.info?.resourceInfo
    ? ResourceServicesMap.mapResourceItemFromApi(params.info.resourceInfo)
    : undefined;
  const publishedVersion = params.info?.agentInfo?.version ?? 0;
  const version = params.bundle?.version ?? publishedVersion;
  return {
    resourceId: params.resourceId,
    resourceInfo: resource,
    title: resource?.resourceName ?? 'Agent',
    name: params.info?.agentInfo?.name ?? '',
    description: params.info?.agentInfo?.description ?? '',
    publishedVersion,
    draftVersion: publishedVersion + 1,
    version,
    status: params.bundle?.status ?? (publishedVersion > 0 ? 'PUBLISHED' : 'DRAFT'),
    spec: mapSpec(params.bundle?.spec),
    assets: (params.bundle?.assets ?? []).map((asset) => ({
      id: asset.id,
      name: asset.name,
      path: asset.path,
      objectKey: asset.objectKey ?? undefined,
      assetResourceType: asset.assetResourceType,
      uploadStatus: asset.uploadStatus,
      size: normalizeNonNegativeNumber(asset.size) ?? 0,
    })),
    ownerId: resource?.ownerId,
    currentActions: resource?.currentActions,
  };
};

export const AgentServicesMap = {
  mapAgentDetail,
  mapSaveAgentDraftRequests,
  mapSpec,
  resolveAssetResourceType,
};
