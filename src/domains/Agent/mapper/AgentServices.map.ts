import { invalidApiResponse, isFiniteNumber, isRecord } from '@/apis/runtimeContract';
import {
  mapVersionResourceInfo,
  validateVersionBundle,
} from '@/domains/_shared/mapper/versionAsset.map';
import type { ResourcePermissionOverview } from '@/domains/Resource';
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
    toolSelectionDefaultEnabled: true,
    toolSelectionOverrides: {},
    enableUseSkill: true,
    onDemandSkillIds: [],
    skillMatchTopK: 3,
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

const mapSpec = (spec?: AgentSpecApi | null): AgentSpec => {
  if (spec == null) {
    return {
      ...AGENT_SPEC_FALLBACK,
      modelPolicy: { ...AGENT_SPEC_FALLBACK.modelPolicy },
      toolAndSkillPolicy: {
        ...AGENT_SPEC_FALLBACK.toolAndSkillPolicy,
        toolSelectionOverrides: {
          ...AGENT_SPEC_FALLBACK.toolAndSkillPolicy.toolSelectionOverrides,
        },
        onDemandSkillIds: [...AGENT_SPEC_FALLBACK.toolAndSkillPolicy.onDemandSkillIds],
      },
      memoryPolicy: { ...AGENT_SPEC_FALLBACK.memoryPolicy },
    };
  }
  if (!isRecord(spec)) invalidApiResponse('Agent spec 契约无效');

  const value = spec as unknown as Record<string, unknown>;
  const modelPolicy = value.modelPolicy;
  const toolPolicy = value.toolAndSkillPolicy;
  const memoryPolicy = value.memoryPolicy;
  if (!isRecord(modelPolicy) || !isRecord(toolPolicy) || !isRecord(memoryPolicy)) {
    invalidApiResponse('Agent spec 策略契约无效');
  }
  const model = modelPolicy as Record<string, unknown>;
  const tool = toolPolicy as Record<string, unknown>;
  const memory = memoryPolicy as Record<string, unknown>;

  const requiredString = (value: unknown, message: string): string => {
    if (typeof value !== 'string') return invalidApiResponse(message);
    return value;
  };
  const requiredBoolean = (value: unknown, message: string): boolean => {
    if (typeof value !== 'boolean') return invalidApiResponse(message);
    return value;
  };
  const optionalString = (value: unknown, message: string): string | undefined => {
    if (value == null) return undefined;
    if (typeof value !== 'string') return invalidApiResponse(message);
    return value;
  };
  const optionalNumber = (value: unknown, message: string): number | undefined => {
    if (value == null) return undefined;
    if (!isFiniteNumber(value)) return invalidApiResponse(message);
    return value;
  };
  const boundedInteger = (
    value: unknown,
    minimum: number,
    exclusiveMaximum: number,
    message: string
  ): number | undefined => {
    if (value == null) return undefined;
    if (!isFiniteNumber(value)) return invalidApiResponse(message);
    if (!Number.isInteger(value) || value < minimum || value >= exclusiveMaximum)
      return invalidApiResponse(message);
    return value;
  };

  const defaultModelId = optionalString(model.defaultModelId, 'Agent 模型策略契约无效') ?? '';
  const defaultProviderId = optionalString(model.defaultProviderId, 'Agent 模型策略契约无效') ?? '';
  const toolSelectionOverrides = tool.toolSelectionOverrides;
  if (
    toolSelectionOverrides != null &&
    (!isRecord(toolSelectionOverrides) ||
      !Object.values(toolSelectionOverrides).every((value) => typeof value === 'boolean'))
  ) {
    invalidApiResponse('Agent 工具策略契约无效');
  }
  const onDemandSkillIds = tool.onDemandSkillIds;
  if (
    onDemandSkillIds != null &&
    (!Array.isArray(onDemandSkillIds) ||
      !onDemandSkillIds.every((value) => typeof value === 'string'))
  ) {
    invalidApiResponse('Agent Skill 策略契约无效');
  }
  const normalizedToolSelectionOverrides = isRecord(toolSelectionOverrides)
    ? (toolSelectionOverrides as Record<string, boolean>)
    : {};
  const normalizedOnDemandSkillIds = Array.isArray(onDemandSkillIds)
    ? (onDemandSkillIds as string[])
    : [];
  return {
    systemPrompt: requiredString(value.systemPrompt, 'Agent spec systemPrompt 契约无效'),
    agentMd: optionalString(value.agentMd, 'Agent spec agentMd 契约无效'),
    autoGenerateTitle: requiredBoolean(
      value.autoGenerateTitle,
      'Agent spec autoGenerateTitle 契约无效'
    ),
    billingGroupId: optionalString(value.billingGroupId, 'Agent spec billingGroupId 契约无效'),
    agentMaxIterations: boundedInteger(
      value.agentMaxIterations,
      1,
      10,
      'Agent spec agentMaxIterations 契约无效'
    ),
    modelPolicy: {
      defaultModelId,
      defaultProviderId,
      allowRequestOverride: requiredBoolean(
        model.allowRequestOverride,
        'Agent 模型策略 allowRequestOverride 契约无效'
      ),
    },
    toolAndSkillPolicy: {
      enableUseTool: requiredBoolean(tool.enableUseTool, 'Agent 工具策略契约无效'),
      toolSelectionDefaultEnabled: requiredBoolean(
        tool.toolSelectionDefaultEnabled,
        'Agent 工具策略契约无效'
      ),
      toolSelectionOverrides: { ...normalizedToolSelectionOverrides },
      enableUseSkill: requiredBoolean(tool.enableUseSkill, 'Agent Skill 策略契约无效'),
      onDemandSkillIds: [...normalizedOnDemandSkillIds],
      skillMatchTopK:
        boundedInteger(tool.skillMatchTopK, 0, 30, 'Agent spec skillMatchTopK 契约无效') ??
        AGENT_SPEC_FALLBACK.toolAndSkillPolicy.skillMatchTopK,
    },
    memoryPolicy: {
      enableChatMemory: requiredBoolean(memory.enableChatMemory, 'Agent 记忆策略契约无效'),
      enablePersistenceChatMemory: requiredBoolean(
        memory.enablePersistenceChatMemory,
        'Agent 记忆策略契约无效'
      ),
      enableChatMemorySummary: requiredBoolean(
        memory.enableChatMemorySummary,
        'Agent 记忆策略契约无效'
      ),
      highWatermarkRatio:
        optionalNumber(memory.highWatermarkRatio, 'Agent 记忆策略契约无效') ??
        AGENT_SPEC_FALLBACK.memoryPolicy.highWatermarkRatio,
      lowWatermarkRatio:
        optionalNumber(memory.lowWatermarkRatio, 'Agent 记忆策略契约无效') ??
        AGENT_SPEC_FALLBACK.memoryPolicy.lowWatermarkRatio,
      summaryPrompt: optionalString(memory.summaryPrompt, 'Agent 记忆策略契约无效') ?? '',
      enableLongTermMemory: requiredBoolean(memory.enableLongTermMemory, 'Agent 记忆策略契约无效'),
      longTermMemoryLimit:
        optionalNumber(memory.longTermMemoryLimit, 'Agent 记忆策略契约无效') ??
        AGENT_SPEC_FALLBACK.memoryPolicy.longTermMemoryLimit,
      longTermMemoryScoreThreshold:
        optionalNumber(memory.longTermMemoryScoreThreshold, 'Agent 记忆策略契约无效') ??
        AGENT_SPEC_FALLBACK.memoryPolicy.longTermMemoryScoreThreshold,
    },
  };
};

const mapAgentSpecToApi = (spec: AgentSpec): AgentSpecApi => ({
  systemPrompt: spec.systemPrompt,
  agentMd: spec.agentMd,
  autoGenerateTitle: spec.autoGenerateTitle,
  billingGroupId: spec.billingGroupId,
  agentMaxIterations: spec.agentMaxIterations,
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
}): AgentDetail => {
  if (params.info != null && !isRecord(params.info)) invalidApiResponse('Agent 信息契约无效');
  if (params.bundle != null) validateVersionBundle(params.bundle);
  const info = params.info as AgentInfoApiResponse | undefined;
  const bundle = params.bundle as AgentVersionBundleApiResponse | undefined;
  const resource = info?.resourceInfo
    ? ResourceServicesMap.mapResourceItemFromApi(info.resourceInfo)
    : undefined;
  const agentInfo = info?.agentInfo ? mapVersionResourceInfo(info.agentInfo) : undefined;
  const publishedVersion = agentInfo?.version ?? 0;
  const version = bundle?.version ?? publishedVersion;
  return {
    resourceId: params.resourceId,
    resourceInfo: resource,
    title: resource?.resourceName ?? 'Agent',
    name: agentInfo?.name ?? '',
    description: agentInfo?.description ?? '',
    publishedVersion,
    draftVersion: publishedVersion + 1,
    version,
    status: bundle?.status ?? (publishedVersion > 0 ? 'PUBLISHED' : 'DRAFT'),
    spec: mapSpec(bundle?.spec),
    assets: (bundle?.assets ?? []).map((asset) => ({
      id: asset.id ?? '',
      name: asset.name ?? '',
      path: asset.path ?? '/',
      objectKey: typeof asset.objectKey === 'string' ? asset.objectKey : undefined,
      assetResourceType: asset.assetResourceType ?? 'TEXT',
      uploadStatus: asset.uploadStatus ?? 'UPLOADING',
      size: normalizeNonNegativeNumber(asset.size) ?? 0,
    })),
    ownerId: resource?.ownerId,
    currentActions: resource?.currentActions,
  };
};

const mapAgentPermissionOverviewFromApi = (
  info: AgentInfoApiResponse | null | undefined,
  resourceId: string
): ResourcePermissionOverview =>
  ResourceServicesMap.mapResourcePermissionOverviewFromApi(
    info?.resourceInfo ?? { resourceId, resourceName: '', ownerInfo: {} },
    resourceId
  );

export const AgentServicesMap = {
  mapAgentDetail,
  mapAgentPermissionOverviewFromApi,
  mapSaveAgentDraftRequests,
  mapSpec,
  resolveAssetResourceType,
};
