import type { DynamicToolUIPart, ToolUIPart, UITool, UIToolInvocation } from 'ai';

import type {
  ActiveChatTurnApiResponse,
  ChatSessionApi,
  CreateSessionApiRequest,
  ListHistoryMessagesApiRequest,
  ListHistoryMessagesApiResponse,
  ListSessionsApiRequest,
  ListSessionsApiResponse,
  RenameSessionApiRequest,
  SetSessionAgentApiRequest,
} from '../apis/ChatSessionApi.schema';
import type {
  ChatMessageMetadata,
  MessageAttachmentSnapshot,
  WisePenUIMessage,
} from '../entity/message';
import type {
  ChatSession,
  CreateSessionRequest,
  ListHistoryMessagesRequest,
  ListSessionsRequest,
  PageResult,
  RenameSessionRequest,
  SetSessionAgentRequest,
} from '../service/index.type';

const mapActiveTurnIdFromApi = (data: ActiveChatTurnApiResponse): string | null => data.turn_id;

const mapCreateSessionRequest = (params?: CreateSessionRequest): CreateSessionApiRequest => {
  const title = params?.title;
  const hasTitle = title !== undefined;
  const agentId = params?.agentId;

  return {
    ...(hasTitle ? { title } : {}),
    ...(agentId !== undefined ? { agent_id: agentId } : {}),
  };
};

const mapSessionFromApi = (data: ChatSessionApi): ChatSession => ({
  id: data.id,
  userId: data.user_id,
  title: data.title,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  agentId: data.agent_id,
  agentVersion: data.agent_version,
});

const mapCreateSessionFromApi = (data: ChatSessionApi): ChatSession => mapSessionFromApi(data);

const mapSetSessionAgentRequest = (params: SetSessionAgentRequest): SetSessionAgentApiRequest => ({
  session_id: params.sessionId,
  ...(params.agentId !== undefined ? { agent_id: params.agentId } : {}),
});

const mapSetSessionAgentFromApi = (data: ChatSessionApi): ChatSession => mapSessionFromApi(data);

const mapRenameSessionRequest = (params: RenameSessionRequest): RenameSessionApiRequest => {
  const newTitle = params.newTitle;
  const hasNewTitle = newTitle !== undefined;

  return {
    session_id: params.sessionId,
    ...(hasNewTitle ? { new_title: newTitle } : {}),
  };
};

const mapRenameSessionFromApi = (data: ChatSessionApi): ChatSession => mapSessionFromApi(data);

const mapListSessionsRequest = (params?: ListSessionsRequest): ListSessionsApiRequest => ({
  ...(params?.page !== undefined ? { page: params.page } : {}),
  ...(params?.size !== undefined ? { size: params.size } : {}),
});

const mapListSessionsFromApi = (data: ListSessionsApiResponse): PageResult<ChatSession> => ({
  list: data.list.map(mapSessionFromApi),
  total: data.total,
  page: data.page,
  size: data.size,
  totalPage: data.total_page,
});

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

/** 历史 metadata / 模型字段占位：后端透出后即可回放附件与模型图标。 */
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
): PageResult<WisePenUIMessage> => ({
  list: data.list
    .map(mapMessageFromApi)
    .filter((message): message is WisePenUIMessage => message !== null),
  total: data.total,
  page: data.page,
  size: data.size,
  totalPage: data.total_page,
});

export const ChatServicesMap = {
  mapActiveTurnIdFromApi,
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
