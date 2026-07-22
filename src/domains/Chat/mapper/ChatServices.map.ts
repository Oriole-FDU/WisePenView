import type { DynamicToolUIPart, ToolUIPart, UITool, UIToolInvocation } from 'ai';
import type {
  CreateSessionApiRequest,
  CreateSessionApiResponse,
  ListHistoryMessagesApiRequest,
  ListHistoryMessagesApiResponse,
  ListModelsApiResponse,
  ListSessionsApiRequest,
  ListSessionsApiResponse,
  ModelProviderMappingResponse,
  RenameSessionApiRequest,
  RenameSessionApiResponse,
  SetSessionAgentApiRequest,
  SetSessionAgentApiResponse,
} from '../apis/ChatApi.type';
import type {
  ChatMessageMetadata,
  MessageAttachmentSnapshot,
  WisePenUIMessage,
} from '../entity/message';
import { MODEL_TYPE } from '../enum/model';
import type {
  ChatModel,
  ChatModelProviderOption,
  ChatSession,
  CreateSessionRequest,
  ListHistoryMessagesRequest,
  ListSessionsRequest,
  PageResult,
  RenameSessionRequest,
  SetSessionAgentRequest,
} from '../service/index.type';

const PROVIDER_KEY_HINTS: Array<{ key: string; patterns: string[] }> = [
  { key: 'anthropic', patterns: ['anthropic', 'claude'] },
  { key: 'google', patterns: ['google', 'gemini'] },
  { key: 'grok', patterns: ['grok', 'xai', 'x.ai'] },
  { key: 'deepseek', patterns: ['deepseek'] },
  { key: 'doubao', patterns: ['doubao', 'bytedance'] },
  { key: 'meta', patterns: ['meta', 'llama'] },
  { key: 'mistral', patterns: ['mistral'] },
  { key: 'openai', patterns: ['openai', 'gpt', 'o1', 'o3', 'o4'] },
  { key: 'qwen', patterns: ['qwen', 'tongyi', 'dashscope', 'alibaba'] },
];

const MODEL_FAMILY_PROVIDER_MAP: Record<string, string> = {
  CLAUDE: 'anthropic',
  GEMINI: 'google',
  GPT: 'openai',
  QWEN: 'qwen',
};

const MODEL_TYPE_LABEL_MAP: Record<number, ChatModel['category']> = {
  [MODEL_TYPE.ADVANCED_MODEL]: 'reasoning',
  [MODEL_TYPE.STANDARD_MODEL]: 'all-round',
  [MODEL_TYPE.CUSTOM_MODEL]: 'chat',
  [MODEL_TYPE.UNKNOWN_MODEL]: 'chat',
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
  model: ListModelsApiResponse['system_models'][number]
): ChatModelProviderOption => ({
  providerId: mapping.provider_id,
  providerName: mapping.provider_name,
  providerModelName: mapping.provider_model_name,
  provider: inferProviderKey(
    mapping.provider_name,
    mapping.provider_model_name,
    MODEL_FAMILY_PROVIDER_MAP[model.model_family],
    model.display_name
  ),
  supportRuntimeOptions: mapping.support_runtime_options ?? {},
  isPreferred: mapping.is_preferred,
  isActive: mapping.is_active,
  priority: mapping.priority,
});

const getOrderedProviderOptions = (
  model: ListModelsApiResponse['system_models'][number]
): ChatModelProviderOption[] =>
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
  model: ListModelsApiResponse['system_models'][number],
  providerOption: ChatModelProviderOption | undefined,
  index: number
): ChatModel['tags'] => [
  ...(model.is_active && index === 0 ? [{ text: 'Default', type: 'blue' }] : []),
  ...(model.support_thinking ? [{ text: 'Thinking', type: 'purple' }] : []),
  ...(model.support_vision ? [{ text: 'Vision', type: 'green' }] : []),
  ...(providerOption?.isPreferred ? [{ text: 'Preferred', type: 'blue' }] : []),
];

const createFallbackProviderOption = (
  model: ListModelsApiResponse['system_models'][number]
): ChatModelProviderOption => {
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

const mapModelOption = (
  model: ListModelsApiResponse['system_models'][number],
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
  ratio: model.billing_ratio,
  supportThinking: model.support_thinking,
  supportTools: model.support_tools,
  tags: buildModelTags(model, providerOption, index),
  multiplier: model.billing_ratio >= 1 ? `${model.billing_ratio}x 消耗` : null,
  isDefault: model.is_active && index === 0,
  vision: model.support_vision,
  usageRank: index + 1,
  contextWindowTokens: model.context_window_tokens,
  maxOutputTokens: model.max_output_tokens,
  category: MODEL_TYPE_LABEL_MAP[model.type] ?? 'chat',
});

const mapGetModelsFromApi = (data: ListModelsApiResponse): ChatModel[] => {
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

  return modelOptions;
};

const mapCreateSessionRequest = (params?: CreateSessionRequest): CreateSessionApiRequest => {
  const title = params?.title;
  const hasTitle = title !== undefined;
  const agentId = params?.agentId;
  const agentVersion = params?.agentVersion;

  return {
    ...(hasTitle ? { title } : {}),
    ...(agentId !== undefined ? { agent_id: agentId } : {}),
    ...(agentVersion !== undefined ? { agent_version: agentVersion } : {}),
  };
};

const mapSessionFromApi = (data: CreateSessionApiResponse): ChatSession => ({
  id: data.id,
  userId: data.user_id,
  title: data.title,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  agentId: data.agent_id,
  agentVersion: data.agent_version,
});

const mapCreateSessionFromApi = (data: CreateSessionApiResponse): ChatSession =>
  mapSessionFromApi(data);

const mapSetSessionAgentRequest = (params: SetSessionAgentRequest): SetSessionAgentApiRequest => ({
  session_id: params.sessionId,
  ...(params.agentId !== undefined ? { agent_id: params.agentId } : {}),
  ...(params.agentVersion !== undefined ? { agent_version: params.agentVersion } : {}),
});

const mapSetSessionAgentFromApi = (data: SetSessionAgentApiResponse): ChatSession =>
  mapSessionFromApi(data);

const mapRenameSessionRequest = (params: RenameSessionRequest): RenameSessionApiRequest => {
  const newTitle = params.newTitle;
  const hasNewTitle = newTitle !== undefined;

  return {
    session_id: params.sessionId,
    ...(hasNewTitle ? { new_title: newTitle } : {}),
  };
};

const mapRenameSessionFromApi = (data: RenameSessionApiResponse): ChatSession =>
  mapSessionFromApi(data);

const mapListSessionsRequest = (params?: ListSessionsRequest): ListSessionsApiRequest => ({
  ...(params?.page !== undefined ? { page: params.page } : {}),
  ...(params?.size !== undefined ? { size: params.size } : {}),
});

const mapListSessionsFromApi = (data: ListSessionsApiResponse): PageResult<ChatSession> => {
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
      if (!approval || typeof approval.id !== 'string') return null;
      return {
        ...details,
        state: 'approval-requested',
        input: data.input,
        approval: {
          id: approval.id,
          ...(typeof approval.signature === 'string' ? { signature: approval.signature } : {}),
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
    if (typeof data.text !== 'string') return null;
    const state = mapTextState(data.state);
    return { type: data.type, text: data.text, ...(state ? { state } : {}) };
  }
  if (data.type === 'step-start') return { type: 'step-start' };
  if (data.type === 'dynamic-tool' || isToolPartType(data.type)) return mapToolPart(data);

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

/** 历史 metadata / 模型字段占位：后端透出后即可回放附件与模型 icon */
function mapMessageMetadata(data: {
  metadata?: unknown;
  createdAt?: unknown;
  created_at?: unknown;
}): ChatMessageMetadata | undefined {
  const rawMetadata = getRecord(data.metadata);
  const rawCreatedAt = data.createdAt ?? data.created_at;
  const createdAt = typeof rawCreatedAt === 'string' ? rawCreatedAt : undefined;
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

function mapMessageFromApi(
  data: ListHistoryMessagesApiResponse['list'][number]
): WisePenUIMessage | null {
  if (
    typeof data.id !== 'string' ||
    (data.role !== 'system' && data.role !== 'user' && data.role !== 'assistant')
  ) {
    return null;
  }
  const parts = Array.isArray(data.parts)
    ? data.parts
        .map(mapMessagePartFromApi)
        .filter((part): part is WisePenMessagePart => part !== null)
    : [];
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
  return {
    list: data.list
      .map(mapMessageFromApi)
      .filter((message): message is WisePenUIMessage => message !== null),
    total: data.total,
    page: data.page,
    size: data.size,
    totalPage: data.total_page,
  };
};

export const ChatServicesMap = {
  mapGetModelsFromApi,
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
