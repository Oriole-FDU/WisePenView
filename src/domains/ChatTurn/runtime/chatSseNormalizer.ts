import { type EventSourceMessage, EventSourceParserStream } from 'eventsource-parser/stream';

import { FRONTEND_NETWORK_ERROR, WisePenError } from '@/utils/error';

import { ChatSseEventDataApiSchema } from '../apis/ChatStreamApi.schema';

const CHAT_SSE_MAX_EVENT_SIZE = 8 * 1024 * 1024;

type BackendToolApprovalRequestEvent = {
  type: 'data-tool-approval-request';
  approvalId: string;
  toolCallId: string;
  toolName: string;
  input: unknown;
};

type BackendToolExecutionErrorEvent = {
  type: 'data-tool-execution-error';
  toolCallId: string;
  errorText: string;
};

type BackendToolExecutionDeniedEvent = {
  type: 'data-tool-execution-denied';
  toolCallId: string;
};

function getRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value == null || Array.isArray(value)) return null;
  return Object.fromEntries(Object.entries(value));
}

function isToolApprovalRequestEvent(
  value: Record<string, unknown>
): value is BackendToolApprovalRequestEvent {
  return (
    value.type === 'data-tool-approval-request' &&
    typeof value.approvalId === 'string' &&
    typeof value.toolCallId === 'string' &&
    typeof value.toolName === 'string'
  );
}

function isToolExecutionErrorEvent(
  value: Record<string, unknown>
): value is BackendToolExecutionErrorEvent {
  return (
    value.type === 'data-tool-execution-error' &&
    typeof value.toolCallId === 'string' &&
    typeof value.errorText === 'string'
  );
}

function isToolExecutionDeniedEvent(
  value: Record<string, unknown>
): value is BackendToolExecutionDeniedEvent {
  return value.type === 'data-tool-execution-denied' && typeof value.toolCallId === 'string';
}

/**
 * 后端为高危工具发送扁平 data-* 事件，AI SDK 6 要求 data-* 使用 data 字段。
 * 在传输边界转换成 SDK 标准工具事件，审批说明统一由前端文案展示。
 */
export function normalizeChatSseData(data: string): string[] {
  if (data === '[DONE]') return [data];

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch (error) {
    throw new WisePenError({
      code: FRONTEND_NETWORK_ERROR.INVALID_RESPONSE,
      source: 'http',
      message: '聊天流事件不是合法 JSON',
      cause: error,
    });
  }
  const validation = ChatSseEventDataApiSchema.safeParse(parsed);
  if (!validation.success) {
    throw new WisePenError({
      code: FRONTEND_NETWORK_ERROR.INVALID_RESPONSE,
      source: 'http',
      message: '聊天流事件契约不匹配',
      meta: {
        issues: validation.error.issues.map((issue) => ({
          path: issue.path.join('.') || '$',
          code: issue.code,
        })),
      },
      cause: validation.error,
    });
  }
  const event = getRecord(parsed);
  if (!event) return [data];

  if (isToolApprovalRequestEvent(event)) {
    return [
      JSON.stringify({
        type: 'tool-approval-request',
        approvalId: event.approvalId,
        toolCallId: event.toolCallId,
      }),
      JSON.stringify({
        type: 'data-tool-approval-request',
        data: {
          approvalId: event.approvalId,
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          input: event.input,
        },
      }),
    ];
  }

  if (isToolExecutionErrorEvent(event)) {
    return [
      JSON.stringify({
        type: 'tool-output-error',
        toolCallId: event.toolCallId,
        errorText: event.errorText,
      }),
    ];
  }

  if (isToolExecutionDeniedEvent(event)) {
    return [
      JSON.stringify({
        type: 'tool-output-denied',
        toolCallId: event.toolCallId,
      }),
    ];
  }

  return [data];
}

function encodeSseMessage(message: EventSourceMessage, data: string): string {
  const lines: string[] = [];
  if (message.event) lines.push(`event: ${message.event}`);
  if (message.id) lines.push(`id: ${message.id}`);
  for (const line of data.split('\n')) lines.push(`data: ${line}`);
  return `${lines.join('\n')}\n\n`;
}

export function normalizeChatSseResponse(response: Response): Response {
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
    return response;
  }

  const normalizedBody = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(
      new EventSourceParserStream({
        onError: 'terminate',
        maxBufferSize: CHAT_SSE_MAX_EVENT_SIZE,
      })
    )
    .pipeThrough(
      new TransformStream<EventSourceMessage, string>({
        transform(message, controller) {
          for (const data of normalizeChatSseData(message.data)) {
            controller.enqueue(encodeSseMessage(message, data));
          }
        },
      })
    )
    .pipeThrough(new TextEncoderStream());

  return new Response(normalizedBody, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
