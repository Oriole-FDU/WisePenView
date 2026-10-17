import type { DynamicToolUIPart, ToolUIPart, UITool, UIToolInvocation } from 'ai';

import { isFiniteNumber, isRecord } from '@/apis/runtimeContract';
import { FRONTEND_NETWORK_ERROR } from '@/utils/error/codes';
import { WisePenError } from '@/utils/error/WisePenError';

import type {
  ActiveChatTurnApiResponse,
  CreateSessionApiRequest,
  CreateSessionApiResponse,
  ListAvailableModelsApiResponse,
  ListHistoryMessagesApiRequest,
  ListHistoryMessagesApiResponse,
  ListModelsApiResponse,
  ListSessionsApiRequest,
  ListSessionsApiResponse,
  ListToolsApiResponse,
  ListUserProvidersApiResponse,
  ModelProviderMappingResponse,
  ModelResponse,
  ProviderApiResponse,
  RenameSessionApiRequest,
  RenameSessionApiResponse,
  SetSessionAgentApiRequest,
  SetSessionAgentApiResponse,
  ToolApiResponse,
} from '../apis/ChatApi.type';
import type {
  ChatMessageMetadata,
  MessageAttachmentSnapshot,
  WisePenUIMessage,
} from '../entity/message';
import type {
  ChatModel,
  ChatModelConfig,
  ChatModelProviderOption,
  ChatProvider,
  ChatSession,
  CreateSessionRequest,
  ListHistoryMessagesRequest,
  ListSessionsRequest,
  PageResult,
  RenameSessionRequest,
  SetSessionAgentRequest,
  ToolOption,
} from '../service/index.type';

const PROVIDER_KEY_HINTS: Array<{ key: string; patterns: string[] }> = [
  { key: 'anthropic', patterns: ['anthropic', 'claude'] },
  { key: 'google', patterns: ['google', 'gemini'] },
  { key: 'grok', patterns: ['grok', 'xai', 'x.ai'] },
  { key: 'deepseek', patterns: ['deepseek'] },
  { key: 'doubao', patterns: ['doubao', 'bytedance'] },
  { key: 'meta', patterns: ['meta', 'llama'] },
  { key: 'mistral', patterns: ['mistral'] },
  { key: 'zhipu', patterns: ['zhipu', 'chatglm', 'glm', '智谱'] },
  { key: 'openai', patterns: ['openai', 'gpt', 'o1', 'o3', 'o4'] },
  { key: 'qwen', patterns: ['qwen', 'tongyi', 'dashscope', 'alibaba'] },
];

const optionalString = (value: unknown): string | null | undefined =>
  value === null || typeof value === 'string' ? value : undefined;

const optionalNumber = (value: unknown): number | null | undefined =>
  value === null || isFiniteNumber(value) ? value : undefined;

const optionalBoolean = (value: unknown): boolean | null | undefined =>
  value === null || typeof value === 'boolean' ? value : undefined;

const invalidChatResponse = (): never => {
  throw new WisePenError({
    code: FRONTEND_NETWORK_ERROR.INVALID_RESPONSE,
    source: 'api',
    message: 'Chat API response 契约无效',
  });
};

const isTemporaryAttachmentRefResponse = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.attachment_id === 'string' &&
  typeof value.attachment_type === 'string' &&
  typeof value.attachment_name === 'string' &&
  typeof value.object_key === 'string' &&
  typeof value.extension === 'string' &&
  Number.isSafeInteger(value.file_size) &&
  Number(value.file_size) >= 0;

const isResourceAttachmentRefResponse = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.attachment_id === 'string' &&
  typeof value.attachment_type === 'string' &&
  typeof value.attachment_name === 'string' &&
  typeof value.resource_id === 'string' &&
  typeof value.resource_type === 'string';

const isChatAgentSpec = (value: unknown): boolean => {
  if (
    !isRecord(value) ||
    typeof value.system_prompt !== 'string' ||
    typeof value.auto_generate_title !== 'boolean'
  )
    return false;
  const model = value.model_policy;
  const tool = value.tool_and_skill_policy;
  const memory = value.memory_policy;
  return (
    isRecord(model) &&
    typeof model.allow_request_override === 'boolean' &&
    isRecord(tool) &&
    ['enable_use_tool', 'tool_selection_default_enabled', 'enable_use_skill'].every(
      (key) => typeof tool[key] === 'boolean'
    ) &&
    isRecord(tool.tool_selection_overrides) &&
    Object.values(tool.tool_selection_overrides).every((item) => typeof item === 'boolean') &&
    (tool.on_demand_skill_ids == null ||
      (Array.isArray(tool.on_demand_skill_ids) &&
        tool.on_demand_skill_ids.every((item) => typeof item === 'string'))) &&
    isRecord(memory) &&
    [
      'enable_chat_memory',
      'enable_persistence_chat_memory',
      'enable_chat_memory_summary',
      'enable_long_term_memory',
    ].every((key) => typeof memory[key] === 'boolean')
  );
};

const isChatSessionAgentResponse = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.agent_id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.description === 'string' &&
  typeof value.source_type === 'string' &&
  Number.isSafeInteger(value.version) &&
  typeof value.version_status === 'string' &&
  isChatAgentSpec(value.spec);

const isChatSessionResponse = (value: unknown): value is CreateSessionApiResponse => {
  if (!isRecord(value)) return false;
  if (value.agent !== undefined && value.agent !== null && !isChatSessionAgentResponse(value.agent))
    return false;
  return (
    typeof value.id === 'string' &&
    typeof value.user_id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string' &&
    Array.isArray(value.temporary_attachment_refs) &&
    value.temporary_attachment_refs.every(isTemporaryAttachmentRefResponse) &&
    Array.isArray(value.resource_attachment_refs) &&
    value.resource_attachment_refs.every(isResourceAttachmentRefResponse) &&
    Array.isArray(value.last_selected_skill_ids) &&
    value.last_selected_skill_ids.every((item) => typeof item === 'string') &&
    isRecord(value.last_tool_selection_overrides) &&
    Object.values(value.last_tool_selection_overrides).every((item) => typeof item === 'boolean')
  );
};

const isChatHistoryResponse = (value: unknown): value is ListHistoryMessagesApiResponse => {
  if (
    !isRecord(value) ||
    !Array.isArray(value.list) ||
    !['total', 'page', 'size', 'total_page'].every(
      (key) => typeof value[key] === 'number' && Number.isFinite(value[key])
    )
  )
    return false;
  return value.list.every((item) => {
    if (!isRecord(item) || typeof item.id !== 'string') return false;
    if (item.role !== 'system' && item.role !== 'user' && item.role !== 'assistant') return false;
    return (
      Array.isArray(item.parts) &&
      item.parts.every((part) => isRecord(part) && typeof part.type === 'string')
    );
  });
};

const isChatModelsResponse = (value: unknown): value is ListAvailableModelsApiResponse => {
  if (
    !isRecord(value) ||
    !Array.isArray(value.system_models) ||
    !Array.isArray(value.user_models)
  ) {
    return false;
  }
  return [...value.system_models, ...value.user_models].every(
    (model) =>
      isRecord(model) &&
      typeof model.id === 'string' &&
      (model.scope === 'SYSTEM' || model.scope === 'USER') &&
      typeof model.display_name === 'string' &&
      typeof model.model_family === 'string' &&
      ['QWEN', 'GPT', 'CLAUDE', 'GEMINI', 'GENERIC'].includes(model.model_family) &&
      Number.isSafeInteger(model.billing_ratio) &&
      typeof model.support_thinking === 'boolean' &&
      typeof model.support_vision === 'boolean' &&
      typeof model.support_tools === 'boolean' &&
      typeof model.is_active === 'boolean' &&
      (model.mappings === null ||
        (Array.isArray(model.mappings) &&
          model.mappings.every(
            (mapping) =>
              isRecord(mapping) &&
              typeof mapping.model_id === 'string' &&
              typeof mapping.provider_id === 'string' &&
              typeof mapping.provider_model_name === 'string' &&
              typeof mapping.is_preferred === 'boolean' &&
              typeof mapping.is_active === 'boolean' &&
              Number.isSafeInteger(mapping.priority) &&
              isRecord(mapping.support_runtime_options)
          )))
  );
};

const MODEL_FAMILY_PROVIDER_MAP: Record<string, string> = {
  CLAUDE: 'anthropic',
  GEMINI: 'google',
  GPT: 'openai',
  QWEN: 'qwen',
};

const inferProviderKey = (...values: Array<string | null | undefined>): string => {
  const haystack = values
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();

  const matched = PROVIDER_KEY_HINTS.find((item) =>
    item.patterns.some((pattern) => haystack.includes(pattern))
  );
  return matched?.key ?? 'openai';
};

const normalizeProviderOption = (
  mapping: ModelProviderMappingResponse,
  model: ModelResponse
): ChatModelProviderOption => ({
  providerId: mapping.provider_id,
  providerName: optionalString(mapping.provider_name),
  providerModelName: mapping.provider_model_name,
  provider: inferProviderKey(
    optionalString(mapping.provider_name),
    mapping.provider_model_name,
    MODEL_FAMILY_PROVIDER_MAP[model.model_family],
    model.display_name
  ),
  supportRuntimeOptions: mapping.support_runtime_options ?? {},
  isPreferred: mapping.is_preferred,
  isActive: mapping.is_active,
  priority: mapping.priority,
});

const getOrderedProviderOptions = (model: ModelResponse): ChatModelProviderOption[] =>
  (model.mappings ?? [])
    .filter((mapping) => mapping.is_active)
    .map((mapping) => normalizeProviderOption(mapping, model))
    .sort((a, b) => {
      if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
      return a.priority - b.priority || a.providerModelName.localeCompare(b.providerModelName);
    });

const buildSelectionId = (modelId: string, providerId?: string): string =>
  providerId ? `${modelId}:${providerId}` : modelId;

const buildModelTags = (
  model: ModelResponse,
  providerOption: ChatModelProviderOption | undefined,
  index: number
): ChatModel['tags'] => [
  ...(model.is_active && index === 0 ? [{ text: 'Default', type: 'blue' }] : []),
  ...(model.support_thinking ? [{ text: 'Thinking', type: 'purple' }] : []),
  ...(model.support_vision ? [{ text: 'Vision', type: 'green' }] : []),
  ...(providerOption?.isPreferred ? [{ text: 'Preferred', type: 'blue' }] : []),
];

const createFallbackProviderOption = (model: ModelResponse): ChatModelProviderOption => {
  const provider = inferProviderKey(
    MODEL_FAMILY_PROVIDER_MAP[model.model_family],
    model.display_name
  );
  return {
    providerId: '',
    providerName: null,
    providerModelName: model.display_name,
    provider,
    supportRuntimeOptions: {},
    isPreferred: false,
    isActive: true,
    priority: 0,
  };
};

const isFreeModel = (model: ModelResponse): boolean =>
  model.scope === 'SYSTEM' && model.billing_ratio === 0;

const mapModelOption = (
  model: ModelResponse,
  providerOptions: ChatModelProviderOption[],
  providerOption: ChatModelProviderOption | undefined,
  index: number
): ChatModel => ({
  id: buildSelectionId(model.id, providerOption?.providerId || undefined),
  modelId: model.id,
  name: model.display_name,
  provider:
    providerOption?.provider ??
    inferProviderKey(MODEL_FAMILY_PROVIDER_MAP[model.model_family], model.display_name),
  providerId: providerOption?.providerId || undefined,
  providerName: providerOption?.providerName,
  providerModelName: providerOption?.providerModelName,
  providerOptions,
  scope: model.scope,
  modelFamily: model.model_family,
  isFree: isFreeModel(model),
  supportThinking: model.support_thinking,
  supportTools: model.support_tools,
  tags: buildModelTags(model, providerOption, index),
  isDefault: model.is_active && index === 0,
  vision: model.support_vision,
  usageRank: index + 1,
  contextWindowTokens: optionalNumber(model.context_window_tokens),
  maxOutputTokens: optionalNumber(model.max_output_tokens),
});

const mapGetModelsFromApi = (data: ListAvailableModelsApiResponse): ChatModel[] => {
  if (!isChatModelsResponse(data)) invalidChatResponse();
  const groupedModels = [...data.system_models, ...data.user_models].filter(
    (item) => item.is_active
  );
  const modelOptions: ChatModel[] = [];

  groupedModels.forEach((model) => {
    const providerOptions = getOrderedProviderOptions(model);
    const options =
      providerOptions.length > 0 ? providerOptions : [createFallbackProviderOption(model)];

    options.forEach((providerOption) => {
      const effectiveProviderOptions = providerOptions.length > 0 ? providerOptions : [];
      modelOptions.push(
        mapModelOption(model, effectiveProviderOptions, providerOption, modelOptions.length)
      );
    });
  });

  const firstFreeModelIndex = modelOptions.findIndex((model) => model.isFree);
  const defaultModelIndex =
    firstFreeModelIndex >= 0
      ? firstFreeModelIndex
      : modelOptions.findIndex((model) => model.isDefault);

  return modelOptions.map((model, index) => ({
    ...model,
    isDefault: index === defaultModelIndex,
  }));
};

const mapGetToolsFromApi = (data: ListToolsApiResponse): ToolOption[] => {
  if (
    !isRecord(data) ||
    !Array.isArray(data.tools) ||
    !data.tools.every(
      (tool) =>
        isRecord(tool) &&
        typeof tool.name === 'string' &&
        typeof tool.display_name === 'string' &&
        typeof tool.description === 'string' &&
        (tool.selection_mode === 'user_selectable' || tool.selection_mode === 'contextual') &&
        typeof tool.enabled === 'boolean' &&
        typeof tool.configured === 'boolean' &&
        typeof tool.requires_config === 'boolean' &&
        isRecord(tool.config_schema) &&
        isRecord(tool.secret_fingerprints) &&
        Object.values(tool.secret_fingerprints).every((value) => typeof value === 'string') &&
        (tool.source === null ||
          (isRecord(tool.source) &&
            typeof tool.source.type === 'string' &&
            [tool.source.server_id, tool.source.server_display_name, tool.source.remote_name].every(
              (value) => value === null || typeof value === 'string'
            )))
    )
  )
    invalidChatResponse();
  return data.tools.map((tool) => ({
    toolId: tool.name,
    label: tool.display_name,
    displayName: tool.display_name,
    description: tool.description,
    selectionMode: tool.selection_mode,
    enabled: tool.enabled,
    configured: tool.configured,
    requiresConfig: tool.requires_config,
    source: tool.source
      ? {
          type: tool.source.type,
          serverId: tool.source.server_id,
          serverDisplayName: tool.source.server_display_name,
          remoteName: tool.source.remote_name,
        }
      : null,
    configSchema: tool.config_schema,
    secretFingerprints: tool.secret_fingerprints,
  }));
};

const mapToolFromApi = (tool: ToolApiResponse): ToolOption =>
  mapGetToolsFromApi({ tools: [tool] })[0];

const mapProviderFromApi = (provider: ProviderApiResponse): ChatProvider => ({
  id: provider.id,
  name: provider.name,
  baseUrl: optionalString(provider.base_url) ?? null,
  apiKeyFingerprint: optionalString(provider.api_key_fingerprint) ?? null,
  scope: provider.scope,
  type: provider.type,
  isActive: provider.is_active,
  tokenUsage: provider.token_usage,
  billableTokenUsage: provider.billable_token_usage,
});

const mapUserProvidersFromApi = (data: ListUserProvidersApiResponse): ChatProvider[] => {
  if (
    !isRecord(data) ||
    !Array.isArray(data.providers) ||
    !data.providers.every(
      (provider) =>
        isRecord(provider) &&
        typeof provider.id === 'string' &&
        typeof provider.name === 'string' &&
        (provider.scope === 'SYSTEM' || provider.scope === 'USER') &&
        ['ALIBABA', 'OPENAI', 'ANTHROPIC', 'GOOGLE', 'OPENAI_COMPATIBLE'].includes(provider.type) &&
        typeof provider.is_active === 'boolean' &&
        Number.isSafeInteger(provider.token_usage) &&
        Number.isSafeInteger(provider.billable_token_usage)
    )
  )
    invalidChatResponse();
  return data.providers.map(mapProviderFromApi);
};

const mapModelConfigFromApi = (model: ModelResponse): ChatModelConfig => ({
  id: model.id,
  scope: model.scope,
  displayName: model.display_name,
  modelFamily: model.model_family as ChatModelConfig['modelFamily'],
  billingRatio: model.billing_ratio,
  supportThinking: model.support_thinking,
  supportVision: model.support_vision,
  supportTools: model.support_tools,
  contextWindowTokens: optionalNumber(model.context_window_tokens) ?? null,
  maxOutputTokens: optionalNumber(model.max_output_tokens) ?? null,
  isActive: model.is_active,
  mappings: (model.mappings ?? []).map((mapping) => ({
    providerId: mapping.provider_id,
    providerName: optionalString(mapping.provider_name) ?? null,
    providerModelName: mapping.provider_model_name,
    isPreferred: mapping.is_preferred,
    isActive: mapping.is_active,
    priority: mapping.priority,
  })),
});

const mapModelConfigsFromApi = (data: ListModelsApiResponse): ChatModelConfig[] => {
  if (!isRecord(data) || !isChatModelsResponse({ system_models: data.models, user_models: [] }))
    invalidChatResponse();
  return data.models.map(mapModelConfigFromApi);
};

const mapAvailableModelConfigsFromApi = (
  data: ListAvailableModelsApiResponse
): ChatModelConfig[] => {
  if (!isChatModelsResponse(data)) invalidChatResponse();
  return [...data.system_models, ...data.user_models].map(mapModelConfigFromApi);
};

const mapActiveTurnIdFromApi = (data: ActiveChatTurnApiResponse): string | null => {
  if (!isRecord(data) || (data.turn_id !== null && typeof data.turn_id !== 'string'))
    invalidChatResponse();
  return data.turn_id;
};

const mapCreateSessionRequest = (params?: CreateSessionRequest): CreateSessionApiRequest => {
  const title = params?.title;
  const hasTitle = title !== undefined;
  const agentId = params?.agentId;

  return {
    ...(hasTitle ? { title } : {}),
    ...(agentId !== undefined ? { agent_id: agentId } : {}),
  };
};

const mapSessionFromApi = (data: CreateSessionApiResponse): ChatSession => ({
  id: data.id,
  userId: data.user_id,
  title: data.title,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  agentId: optionalString(data.agent_id),
  agentVersion: optionalNumber(data.agent_version),
  agent:
    data.agent && isChatSessionAgentResponse(data.agent)
      ? {
          agentId: data.agent.agent_id,
          name: data.agent.name,
          description: data.agent.description,
          sourceType: data.agent.source_type,
          version: data.agent.version,
          versionStatus: data.agent.version_status,
          spec: {
            systemPrompt: data.agent.spec.system_prompt,
            agentMd: optionalString(data.agent.spec.agent_md) ?? undefined,
            autoGenerateTitle: data.agent.spec.auto_generate_title,
            billingGroupId: optionalString(data.agent.spec.billing_group_id) ?? undefined,
            agentMaxIterations: optionalNumber(data.agent.spec.agent_max_iterations) ?? undefined,
            modelPolicy: {
              defaultModelId:
                optionalString(data.agent.spec.model_policy.default_model_id) ?? undefined,
              defaultProviderId:
                optionalString(data.agent.spec.model_policy.default_provider_id) ?? undefined,
              allowRequestOverride: data.agent.spec.model_policy.allow_request_override,
            },
            toolAndSkillPolicy: {
              enableUseTool: data.agent.spec.tool_and_skill_policy.enable_use_tool,
              toolSelectionDefaultEnabled:
                data.agent.spec.tool_and_skill_policy.tool_selection_default_enabled,
              toolSelectionOverrides:
                data.agent.spec.tool_and_skill_policy.tool_selection_overrides,
              enableUseSkill: data.agent.spec.tool_and_skill_policy.enable_use_skill,
              onDemandSkillIds: data.agent.spec.tool_and_skill_policy.on_demand_skill_ids?.filter(
                (id): id is string => typeof id === 'string'
              ),
              skillMatchTopK:
                optionalNumber(data.agent.spec.tool_and_skill_policy.skill_match_top_k) ??
                undefined,
            },
            memoryPolicy: {
              enableChatMemory: data.agent.spec.memory_policy.enable_chat_memory,
              enablePersistenceChatMemory:
                data.agent.spec.memory_policy.enable_persistence_chat_memory,
              enableChatMemorySummary: data.agent.spec.memory_policy.enable_chat_memory_summary,
              highWatermarkRatio:
                optionalNumber(data.agent.spec.memory_policy.high_watermark_ratio) ?? undefined,
              lowWatermarkRatio:
                optionalNumber(data.agent.spec.memory_policy.low_watermark_ratio) ?? undefined,
              summaryPrompt:
                optionalString(data.agent.spec.memory_policy.summary_prompt) ?? undefined,
              enableLongTermMemory: data.agent.spec.memory_policy.enable_long_term_memory,
              longTermMemoryLimit:
                optionalNumber(data.agent.spec.memory_policy.long_term_memory_limit) ?? undefined,
              longTermMemoryScoreThreshold:
                optionalNumber(data.agent.spec.memory_policy.long_term_memory_score_threshold) ??
                undefined,
            },
          },
        }
      : data.agent === null
        ? null
        : undefined,
  temporaryAttachmentRefs: data.temporary_attachment_refs.map((ref) => ({
    attachmentId: ref.attachment_id,
    attachmentType: ref.attachment_type,
    attachmentName: ref.attachment_name,
    objectKey: ref.object_key,
    extension: ref.extension,
    fileSize: ref.file_size,
    mimeType: optionalString(ref.mime_type),
  })),
  resourceAttachmentRefs: data.resource_attachment_refs.map((ref) => ({
    attachmentId: ref.attachment_id,
    attachmentType: ref.attachment_type,
    attachmentName: ref.attachment_name,
    resourceId: ref.resource_id,
    resourceType: ref.resource_type,
  })),
  lastSelectedSkillIds: data.last_selected_skill_ids,
  lastToolSelectionDefaultEnabled: optionalBoolean(data.last_tool_selection_default_enabled),
  lastToolSelectionOverrides: data.last_tool_selection_overrides,
});

const mapCreateSessionFromApi = (data: CreateSessionApiResponse): ChatSession =>
  mapSessionFromApi(isChatSessionResponse(data) ? data : invalidChatResponse());

const mapSetSessionAgentRequest = (params: SetSessionAgentRequest): SetSessionAgentApiRequest => ({
  session_id: params.sessionId,
  ...(params.agentId !== undefined ? { agent_id: params.agentId } : {}),
});

const mapSetSessionAgentFromApi = (data: SetSessionAgentApiResponse): ChatSession =>
  mapSessionFromApi(isChatSessionResponse(data) ? data : invalidChatResponse());

const mapRenameSessionRequest = (params: RenameSessionRequest): RenameSessionApiRequest => {
  const newTitle = params.newTitle;
  const hasNewTitle = newTitle !== undefined;

  return {
    session_id: params.sessionId,
    ...(hasNewTitle ? { new_title: newTitle } : {}),
  };
};

const mapRenameSessionFromApi = (data: RenameSessionApiResponse): ChatSession =>
  mapSessionFromApi(isChatSessionResponse(data) ? data : invalidChatResponse());

const mapListSessionsRequest = (params?: ListSessionsRequest): ListSessionsApiRequest => ({
  ...(params?.page !== undefined ? { page: params.page } : {}),
  ...(params?.size !== undefined ? { size: params.size } : {}),
});

const mapListSessionsFromApi = (data: ListSessionsApiResponse): PageResult<ChatSession> => {
  if (
    !isRecord(data) ||
    !Array.isArray(data.list) ||
    !['total', 'page', 'size', 'total_page'].every((key) => isFiniteNumber(data[key]))
  )
    invalidChatResponse();
  if (!data.list.every(isChatSessionResponse)) invalidChatResponse();
  return {
    list: data.list.map(mapSessionFromApi),
    total: data.total,
    page: data.page,
    size: data.size,
    totalPage: data.total_page,
  };
};

const mapListHistoryMessagesRequest = (
  params: ListHistoryMessagesRequest
): ListHistoryMessagesApiRequest => ({
  session_id: params.sessionId,
  ...(params.page !== undefined ? { page: params.page } : {}),
  ...(params.size !== undefined ? { size: params.size } : {}),
});

type WisePenMessagePart = WisePenUIMessage['parts'][number];
type ParsedToolPart = ToolUIPart | DynamicToolUIPart;
type ParsedToolIdentity =
  | Pick<DynamicToolUIPart, 'type' | 'toolName' | 'toolCallId'>
  | Pick<ToolUIPart, 'type' | 'toolCallId'>;
type ToolInvocationState =
  UIToolInvocation<UITool> extends infer Invocation
    ? Invocation extends UIToolInvocation<UITool>
      ? Omit<Invocation, 'toolCallId'>
      : never
    : never;

function getRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value == null || Array.isArray(value)) return null;
  return Object.fromEntries(Object.entries(value));
}

function isToolPartType(value: unknown): value is `tool-${string}` {
  return typeof value === 'string' && value.startsWith('tool-') && value.length > 5;
}

function mapTextState(value: unknown): 'streaming' | 'done' | undefined {
  return value === 'streaming' || value === 'done' ? value : undefined;
}

function mapToolInvocation(data: Record<string, unknown>): ToolInvocationState | null {
  const details = {
    ...(typeof data.title === 'string' ? { title: data.title } : {}),
    ...(typeof data.providerExecuted === 'boolean'
      ? { providerExecuted: data.providerExecuted }
      : {}),
  };

  switch (data.state) {
    case 'input-streaming':
      return { ...details, state: 'input-streaming', input: data.input };
    case 'input-available':
      return { ...details, state: 'input-available', input: data.input };
    case 'approval-requested': {
      const approval = getRecord(data.approval);
      const approvalId =
        typeof approval?.id === 'string'
          ? approval.id
          : typeof data.toolCallId === 'string'
            ? data.toolCallId
            : null;
      if (!approvalId) return null;
      return {
        ...details,
        state: 'approval-requested',
        input: data.input,
        approval: {
          // 挂起会话历史只返回状态，审批 ID 与工具调用 ID 按后端契约相同。
          id: approvalId,
          ...(typeof approval?.signature === 'string' ? { signature: approval.signature } : {}),
        },
      };
    }
    case 'approval-responded': {
      const approval = getRecord(data.approval);
      if (!approval || typeof approval.id !== 'string' || typeof approval.approved !== 'boolean') {
        return null;
      }
      return {
        ...details,
        state: 'approval-responded',
        input: data.input,
        approval: {
          id: approval.id,
          approved: approval.approved,
          ...(typeof approval.reason === 'string' ? { reason: approval.reason } : {}),
          ...(typeof approval.signature === 'string' ? { signature: approval.signature } : {}),
        },
      };
    }
    case 'output-available':
      return {
        ...details,
        state: 'output-available',
        input: data.input,
        output: data.output,
        ...(typeof data.preliminary === 'boolean' ? { preliminary: data.preliminary } : {}),
      };
    case 'output-error':
      if (typeof data.errorText !== 'string') return null;
      return {
        ...details,
        state: 'output-error',
        input: data.input,
        errorText: data.errorText,
      };
    case 'output-denied': {
      const approval = getRecord(data.approval);
      if (!approval || typeof approval.id !== 'string' || approval.approved !== false) return null;
      return {
        ...details,
        state: 'output-denied',
        input: data.input,
        approval: {
          id: approval.id,
          approved: false,
          ...(typeof approval.reason === 'string' ? { reason: approval.reason } : {}),
          ...(typeof approval.signature === 'string' ? { signature: approval.signature } : {}),
        },
      };
    }
    default:
      return null;
  }
}

function combineToolPart(
  identity: ParsedToolIdentity,
  invocation: ToolInvocationState
): ParsedToolPart {
  if (identity.type === 'dynamic-tool') return { ...identity, ...invocation };
  return { ...identity, ...invocation };
}

function mapToolPart(data: Record<string, unknown>): ParsedToolPart | null {
  const isDynamic = data.type === 'dynamic-tool';
  if (!isDynamic && !isToolPartType(data.type)) return null;
  if (typeof data.toolCallId !== 'string' || data.toolCallId.length === 0) return null;
  const invocation = mapToolInvocation(data);
  if (!invocation) return null;

  if (isDynamic) {
    const toolName = data.toolName;
    if (typeof toolName !== 'string' || toolName.length === 0) return null;
    return combineToolPart(
      { type: 'dynamic-tool', toolName, toolCallId: data.toolCallId },
      invocation
    );
  }
  const toolType = data.type;
  if (!isToolPartType(toolType)) return null;
  return combineToolPart({ type: toolType, toolCallId: data.toolCallId }, invocation);
}

function mapMessagePartFromApi(value: unknown): WisePenMessagePart | null {
  const data = getRecord(value);
  if (!data || typeof data.type !== 'string') return null;

  if (data.type === 'text' || data.type === 'reasoning') {
    if (typeof data.text !== 'string') return invalidChatResponse();
    const state = mapTextState(data.state);
    return { type: data.type, text: data.text, ...(state ? { state } : {}) };
  }
  if (data.type === 'step-start') return { type: 'step-start' };
  if (data.type === 'dynamic-tool' || isToolPartType(data.type))
    return mapToolPart(data) ?? invalidChatResponse();

  return null;
}

function mapAttachmentSnapshot(value: unknown): MessageAttachmentSnapshot | null {
  const data = getRecord(value);
  if (
    !data ||
    typeof data.attachmentId !== 'string' ||
    typeof data.filename !== 'string' ||
    (data.kind !== 'temporary' && data.kind !== 'resource') ||
    typeof data.available !== 'boolean'
  ) {
    return null;
  }
  return {
    attachmentId: data.attachmentId,
    filename: data.filename,
    kind: data.kind,
    available: data.available,
  };
}

/** 历史 metadata / 模型字段占位：后端透出后即可回放附件与模型图标 */
function mapMessageMetadata(data: {
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
}): ChatMessageMetadata | undefined {
  const rawMetadata = getRecord(data.metadata);
  const createdAt = typeof data.createdAt === 'string' ? data.createdAt : undefined;
  const selectedAttachments = Array.isArray(rawMetadata?.selectedAttachments)
    ? rawMetadata.selectedAttachments
        .map(mapAttachmentSnapshot)
        .filter((item): item is MessageAttachmentSnapshot => item !== null)
    : undefined;
  const modelId = typeof rawMetadata?.modelId === 'string' ? rawMetadata.modelId : undefined;
  const providerId =
    typeof rawMetadata?.providerId === 'string' ? rawMetadata.providerId : undefined;
  const provider = typeof rawMetadata?.provider === 'string' ? rawMetadata.provider : undefined;
  const modelName = typeof rawMetadata?.modelName === 'string' ? rawMetadata.modelName : undefined;
  const reasoningDurationSeconds =
    typeof rawMetadata?.reasoningDurationSeconds === 'number' &&
    Number.isFinite(rawMetadata.reasoningDurationSeconds)
      ? Math.max(0, Math.round(rawMetadata.reasoningDurationSeconds))
      : undefined;

  if (
    !createdAt &&
    selectedAttachments === undefined &&
    !modelId &&
    !providerId &&
    !provider &&
    !modelName &&
    reasoningDurationSeconds === undefined
  ) {
    return undefined;
  }
  return {
    ...(createdAt ? { createdAt } : {}),
    ...(selectedAttachments !== undefined ? { selectedAttachments } : {}),
    ...(modelId ? { modelId } : {}),
    ...(providerId ? { providerId } : {}),
    ...(provider ? { provider } : {}),
    ...(modelName ? { modelName } : {}),
    ...(reasoningDurationSeconds !== undefined ? { reasoningDurationSeconds } : {}),
  };
}

function mapMessageFromApi(data: ListHistoryMessagesApiResponse['list'][number]): WisePenUIMessage {
  const parts = data.parts
    .map(mapMessagePartFromApi)
    .filter((part): part is WisePenMessagePart => part !== null);
  const metadata = mapMessageMetadata(data);
  return {
    id: data.id,
    role: data.role,
    parts,
    ...(metadata ? { metadata } : {}),
  };
}

const mapListHistoryMessagesFromApi = (
  data: ListHistoryMessagesApiResponse
): PageResult<WisePenUIMessage> => {
  if (!isChatHistoryResponse(data)) invalidChatResponse();
  return {
    list: data.list.map(mapMessageFromApi),
    total: data.total,
    page: data.page,
    size: data.size,
    totalPage: data.total_page,
  };
};

export const ChatServicesMap = {
  mapActiveTurnIdFromApi,
  mapGetModelsFromApi,
  mapGetToolsFromApi,
  mapToolFromApi,
  mapUserProvidersFromApi,
  mapModelConfigsFromApi,
  mapAvailableModelConfigsFromApi,
  mapCreateSessionRequest,
  mapCreateSessionFromApi,
  mapSetSessionAgentRequest,
  mapSetSessionAgentFromApi,
  mapRenameSessionRequest,
  mapRenameSessionFromApi,
  mapListSessionsRequest,
  mapListSessionsFromApi,
  mapListHistoryMessagesRequest,
  mapListHistoryMessagesFromApi,
};
