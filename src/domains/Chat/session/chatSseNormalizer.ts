import { type EventSourceMessage, EventSourceParserStream } from 'eventsource-parser/stream';

import { invalidApiResponse, isRecord } from '@/apis/runtimeContract';

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

const hasString = (event: Record<string, unknown>, key: string): boolean =>
  typeof event[key] === 'string' && Boolean(event[key]);

function validateKnownEvent(event: Record<string, unknown>): void {
  const valid = (() => {
    switch (event.type) {
      case 'start':
        return event.messageId === undefined || hasString(event, 'messageId');
      case 'abort':
        return event.reason === undefined || hasString(event, 'reason');
      case 'error':
        return typeof event.errorText === 'string';
      case 'text-start':
      case 'text-end':
      case 'reasoning-start':
      case 'reasoning-end':
        return hasString(event, 'id');
      case 'text-delta':
      case 'reasoning-delta':
        return hasString(event, 'id') && typeof event.delta === 'string';
      case 'tool-input-start':
        return hasString(event, 'toolCallId') && hasString(event, 'toolName');
      case 'tool-input-delta':
        return hasString(event, 'toolCallId') && typeof event.inputTextDelta === 'string';
      case 'tool-input-available':
        return hasString(event, 'toolCallId') && hasString(event, 'toolName') && 'input' in event;
      case 'tool-input-error':
        return (
          hasString(event, 'toolCallId') &&
          hasString(event, 'toolName') &&
          'input' in event &&
          typeof event.errorText === 'string'
        );
      case 'tool-output-available':
        return hasString(event, 'toolCallId') && 'output' in event;
      case 'source-url':
        return hasString(event, 'sourceId') && hasString(event, 'url');
      case 'source-document':
        return (
          hasString(event, 'sourceId') &&
          hasString(event, 'mediaType') &&
          typeof event.title === 'string'
        );
      case 'file':
        return hasString(event, 'url') && hasString(event, 'mediaType');
      case 'message-metadata':
        return 'messageMetadata' in event;
      case 'tool-approval-request':
        return hasString(event, 'approvalId') && hasString(event, 'toolCallId');
      case 'data-tool-approval-request':
        return (
          hasString(event, 'approvalId') &&
          hasString(event, 'toolCallId') &&
          hasString(event, 'toolName') &&
          'input' in event
        );
      case 'tool-output-error':
      case 'data-tool-execution-error':
        return hasString(event, 'toolCallId') && typeof event.errorText === 'string';
      case 'tool-output-denied':
      case 'data-tool-execution-denied':
        return hasString(event, 'toolCallId');
      default:
        return true;
    }
  })();
  if (!valid) invalidApiResponse(`Chat SSE ${event.type} 事件契约无效`);
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
  } catch {
    return invalidApiResponse('Chat SSE JSON 无效');
  }
  if (!isRecord(parsed) || !hasString(parsed, 'type')) {
    return invalidApiResponse('Chat SSE 事件类型无效');
  }
  const event = parsed;
  validateKnownEvent(event);

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
        onError: () => invalidApiResponse('Chat SSE parser 契约无效'),
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
