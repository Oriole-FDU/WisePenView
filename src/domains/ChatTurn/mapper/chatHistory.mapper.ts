import type { DynamicToolUIPart, ToolUIPart, UITool, UIToolInvocation } from 'ai';

import type { PageResult } from '@/domains/_shared/entity/page';

import type {
  ListHistoryMessagesApiRequest,
  ListHistoryMessagesApiResponse,
} from '../apis/ChatTurnApi.schema';
import {
  type ChatMessageMetadata,
  ChatMessageMetadataSchema,
  type MessageAttachmentSnapshot,
  MessageAttachmentSnapshotSchema,
  type WisePenUIMessage,
} from '../entity/message';

type WisePenMessagePart = WisePenUIMessage['parts'][number];
type ApiMessagePart = ListHistoryMessagesApiResponse['list'][number]['parts'][number];
type ApiToolPart = Extract<ApiMessagePart, { toolCallId: string }>;
type ParsedToolPart = ToolUIPart | DynamicToolUIPart;
type ToolInvocationState =
  UIToolInvocation<UITool> extends infer Invocation
    ? Invocation extends UIToolInvocation<UITool>
      ? Omit<Invocation, 'toolCallId'>
      : never
    : never;

export function mapListHistoryMessagesRequest(params: {
  sessionId: string;
  page?: number;
  size?: number;
}): ListHistoryMessagesApiRequest {
  return {
    session_id: params.sessionId,
    ...(params.page !== undefined ? { page: params.page } : {}),
    ...(params.size !== undefined ? { size: params.size } : {}),
  };
}

function getRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value == null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function mapToolInvocation(data: ApiToolPart): ToolInvocationState {
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
      const approvalId = data.approval?.id ?? data.toolCallId;
      return {
        ...details,
        state: 'approval-requested',
        input: data.input,
        approval: {
          id: approvalId,
          ...(data.approval?.signature ? { signature: data.approval.signature } : {}),
        },
      };
    }
    case 'approval-responded':
      return {
        ...details,
        state: 'approval-responded',
        input: data.input,
        approval: {
          id: data.approval.id,
          approved: data.approval.approved,
          ...(data.approval.reason ? { reason: data.approval.reason } : {}),
          ...(data.approval.signature ? { signature: data.approval.signature } : {}),
        },
      };
    case 'output-available':
      return {
        ...details,
        state: 'output-available',
        input: data.input,
        output: data.output,
        ...(typeof data.preliminary === 'boolean' ? { preliminary: data.preliminary } : {}),
      };
    case 'output-error':
      return {
        ...details,
        state: 'output-error',
        input: data.input,
        errorText: data.errorText,
      };
    case 'output-denied':
      return {
        ...details,
        state: 'output-denied',
        input: data.input,
        approval: {
          id: data.approval.id,
          approved: false,
          ...(data.approval.reason ? { reason: data.approval.reason } : {}),
          ...(data.approval.signature ? { signature: data.approval.signature } : {}),
        },
      };
  }
}

function mapToolPart(data: ApiToolPart): ParsedToolPart {
  const invocation = mapToolInvocation(data);

  if (data.type === 'dynamic-tool') {
    return {
      type: 'dynamic-tool',
      toolName: data.toolName,
      toolCallId: data.toolCallId,
      ...invocation,
    };
  }
  return { type: data.type, toolCallId: data.toolCallId, ...invocation };
}

function mapMessagePartFromApi(data: ApiMessagePart): WisePenMessagePart {
  if (data.type === 'text' || data.type === 'reasoning') {
    return { type: data.type, text: data.text, state: data.state };
  }
  if (data.type === 'step-start') return { type: 'step-start' };
  return mapToolPart(data);
}

function mapAttachmentSnapshot(value: unknown): MessageAttachmentSnapshot | null {
  const parsed = MessageAttachmentSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function mapMessageMetadata(
  data: ListHistoryMessagesApiResponse['list'][number]
): ChatMessageMetadata | undefined {
  const rawMetadata = getRecord(data.metadata);
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

  const candidate = {
    ...(data.createdAt ? { createdAt: data.createdAt } : {}),
    ...(selectedAttachments !== undefined ? { selectedAttachments } : {}),
    ...(modelId ? { modelId } : {}),
    ...(providerId ? { providerId } : {}),
    ...(provider ? { provider } : {}),
    ...(modelName ? { modelName } : {}),
    ...(reasoningDurationSeconds !== undefined ? { reasoningDurationSeconds } : {}),
  };
  if (Object.keys(candidate).length === 0) return undefined;

  const parsed = ChatMessageMetadataSchema.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
}

function mapMessageFromApi(data: ListHistoryMessagesApiResponse['list'][number]): WisePenUIMessage {
  const parts = data.parts.map(mapMessagePartFromApi);
  const metadata = mapMessageMetadata(data);
  return {
    id: data.id,
    role: data.role,
    parts,
    ...(metadata ? { metadata } : {}),
  };
}

export function mapListHistoryMessagesFromApi(
  data: ListHistoryMessagesApiResponse
): PageResult<WisePenUIMessage> {
  return {
    list: data.list.map(mapMessageFromApi),
    total: data.total,
    page: data.page,
    size: data.size,
    totalPage: data.total_page,
  };
}
