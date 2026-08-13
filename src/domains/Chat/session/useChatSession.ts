import { awaitAddrReady, notifyAddrFailure } from '@/apis/apiServerAddr';
import { buildApiUrl } from '@/apis/clientUrls';
import { applyXDeveloperHeader } from '@/apis/developmentTraffic';
import { FRONTEND_NETWORK_ERROR, WisePenError } from '@/utils/error';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type ChatTransport, type UIMessage, type UIMessageChunk } from 'ai';
import { useRef } from 'react';
import type { ChatMessageMetadata, WisePenUIMessage } from '../entity/message';
import { mapChatCompletionRequest } from '../mapper/chatCompletion.mapper';
import type {
  ClientToolCallEvent,
  ClientToolExecutionResult,
  ClientToolResultSubmission,
  SendSessionMessageOptions,
  UseChatSessionOptions,
} from './index.type';

const CHAT_STREAM_THROTTLE_MS = 50;
const CLIENT_TOOL_RECOVERY_DEBOUNCE_MS = 50;
const CLIENT_TOOL_RECOVERY_RETRY_DELAY_MS = 100;
const CLIENT_TOOL_RECOVERY_MAX_RETRIES = 300;

function buildChatFetchInit(init?: RequestInit): RequestInit {
  return {
    ...init,
    credentials: 'include',
    headers: applyXDeveloperHeader(new Headers(init?.headers)),
  };
}

function resolveChatApiUrl(input: RequestInfo | URL): string {
  return typeof input === 'string' || input instanceof URL
    ? new URL(input.toString(), buildApiUrl('/')).toString()
    : input.url;
}

async function fetchChatCompletion(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  await awaitAddrReady();
  try {
    return await fetch(resolveChatApiUrl(input), buildChatFetchInit(init));
  } catch (error) {
    notifyAddrFailure();
    throw error;
  }
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readJsonCode(value: unknown): number | undefined {
  const record = readRecord(value);
  return typeof record?.code === 'number' ? record.code : undefined;
}

function readJsonMessage(value: unknown): string | undefined {
  const record = readRecord(value);
  return readString(record?.msg) ?? readString(record?.message);
}

// 判断当前请求体是否为 recover 请求体。
function hasRecoverPayload(body?: Record<string, unknown>): boolean {
  return Array.isArray(body?.client_tool_results) || Array.isArray(body?.tool_approval_status);
}

function resolveSessionId(
  body: Record<string, unknown> | undefined,
  fallback: string
): string | undefined {
  return readString(body?.session_id) ?? readString(fallback);
}

function mapClientToolCall(sessionId: string, toolCall: unknown): ClientToolCallEvent | undefined {
  const record = readRecord(toolCall);
  const toolCallId = readString(record?.toolCallId);
  const toolName = readString(record?.toolName);

  if (!sessionId || !toolCallId || !toolName) return undefined;

  return {
    sessionId,
    toolCallId,
    toolName,
    input: record?.input,
  };
}

function mapClientToolResult(result: ClientToolExecutionResult): ClientToolResultSubmission {
  if ('errorText' in result) {
    return {
      tool_call_id: result.toolCallId,
      error_text: result.errorText,
    };
  }

  return {
    tool_call_id: result.toolCallId,
    output: result.output,
  };
}

function buildUnavailableToolResult(event: ClientToolCallEvent): ClientToolResultSubmission {
  return {
    tool_call_id: event.toolCallId,
    error_text: `Client tool '${event.toolName}' is unavailable in the current page.`,
  };
}

function waitForCurrentStreamRelease(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function waitForClientToolRecoveryRetry(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, CLIENT_TOOL_RECOVERY_RETRY_DELAY_MS));
}

function readClientToolResultCallIds(body?: Record<string, unknown>): ReadonlySet<string> {
  const results = body?.client_tool_results;
  if (!Array.isArray(results)) return new Set<string>();

  return new Set(
    results
      .map((result) => readString(readRecord(result)?.tool_call_id))
      .filter((toolCallId): toolCallId is string => toolCallId !== undefined)
  );
}

function normalizeRecoverStream(
  stream: ReadableStream<UIMessageChunk>,
  submittedClientToolCallIds: ReadonlySet<string>
): ReadableStream<UIMessageChunk> {
  return stream.pipeThrough(
    new TransformStream<UIMessageChunk, UIMessageChunk>({
      transform(chunk, controller) {
        if (
          (chunk.type === 'tool-input-start' ||
            chunk.type === 'tool-input-delta' ||
            chunk.type === 'tool-input-available') &&
          submittedClientToolCallIds.has(chunk.toolCallId)
        ) {
          return;
        }

        if (chunk.type === 'start') {
          const continuationChunk = { ...chunk };
          delete continuationChunk.messageId;
          controller.enqueue(continuationChunk);
          return;
        }

        controller.enqueue(chunk);
      },
    })
  );
}

function isTransientRecoverError(value: unknown, responseText: string): boolean {
  const message = readJsonMessage(value) ?? responseText;
  return (
    readJsonCode(value) === 40006 ||
    readJsonCode(value) === 40036 ||
    message.includes('当前会话已有正在运行的对话') ||
    message.includes('SuspendedChat 不存在')
  );
}

class WisePenChatTransport<UI_MESSAGE extends UIMessage> extends DefaultChatTransport<UI_MESSAGE> {
  async reconnectToStream(
    options: Parameters<ChatTransport<UI_MESSAGE>['reconnectToStream']>[0]
  ): Promise<ReadableStream<UIMessageChunk> | null> {
    const body = readRecord(options.body);
    const sessionId = resolveSessionId(body, options.chatId);
    if (!sessionId) return null;

    const isRecoverRequest = hasRecoverPayload(body);
    const headers = new Headers(options.headers);
    const requestInit = isRecoverRequest
      ? {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        }
      : {
          method: 'GET',
          headers,
        };
    if (isRecoverRequest) {
      headers.set('Content-Type', 'application/json');
    }

    for (let retryCount = 0; ; retryCount += 1) {
      await awaitAddrReady();
      const streamUrl = `${buildApiUrl('/chat/completions/stream')}?session_id=${encodeURIComponent(sessionId)}`;
      const recoverUrl = buildApiUrl('/chat/completions/recover');
      const response = await fetchChatCompletion(
        isRecoverRequest ? recoverUrl : streamUrl,
        requestInit
      );

      if (response.status === 204) return null;
      if (!response.ok) {
        const responseText = await response.text();
        let parsedBody: unknown = undefined;
        try {
          parsedBody = JSON.parse(responseText) as unknown;
        } catch {
          parsedBody = undefined;
        }

        if (
          isRecoverRequest &&
          isTransientRecoverError(parsedBody, responseText) &&
          retryCount < CLIENT_TOOL_RECOVERY_MAX_RETRIES
        ) {
          await waitForClientToolRecoveryRetry();
          continue;
        }

        const serverMsg =
          readJsonMessage(parsedBody) ??
          responseText.trim() ??
          'Failed to recover the chat response.';
        throw new WisePenError({
          code: FRONTEND_NETWORK_ERROR.HTTP,
          source: 'http',
          serverMsg,
          message: serverMsg,
        });
      }
      if (!response.body) {
        throw new WisePenError({
          code: FRONTEND_NETWORK_ERROR.UNKNOWN,
          source: 'network',
          message: 'The chat response body is empty.',
        });
      }

      if (!isRecoverRequest) {
        return this.processResponseStream(response.body);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/event-stream')) {
        const responseText = await response.text();
        let parsedBody: unknown = undefined;
        try {
          parsedBody = JSON.parse(responseText) as unknown;
        } catch {
          parsedBody = undefined;
        }

        if (
          isTransientRecoverError(parsedBody, responseText) &&
          retryCount < CLIENT_TOOL_RECOVERY_MAX_RETRIES
        ) {
          await waitForClientToolRecoveryRetry();
          continue;
        }

        const serverMsg =
          readJsonMessage(parsedBody) ??
          responseText.trim() ??
          'Failed to recover the chat response.';
        throw new WisePenError({
          code: FRONTEND_NETWORK_ERROR.HTTP,
          source: 'http',
          serverMsg,
          message: serverMsg,
        });
      }

      const responseStream = this.processResponseStream(response.body);
      return normalizeRecoverStream(responseStream, readClientToolResultCallIds(body));
    }
  }
}

/**
 * 对 AI SDK 的聊天 Hook 进行封装，统一接入请求与恢复协议。
 */
export const useChatSession = ({ sessionId, model, onClientToolCall }: UseChatSessionOptions) => {
  const activeToolSessionIdRef = useRef(sessionId);
  const pendingClientToolResultsRef = useRef<ClientToolResultSubmission[]>([]);
  const inFlightClientToolExecutionsRef = useRef<Set<Promise<void>>>(new Set());
  const handledClientToolCallIdsRef = useRef<Set<string>>(new Set());
  const recoveringClientToolsRef = useRef(false);
  const scheduledClientToolRecoveryRef = useRef<number | null>(null);

  const scheduleClientToolRecovery = () => {
    if (scheduledClientToolRecoveryRef.current != null) return;

    scheduledClientToolRecoveryRef.current = window.setTimeout(() => {
      scheduledClientToolRecoveryRef.current = null;
      void flushPendingClientToolExecutions();
    }, CLIENT_TOOL_RECOVERY_DEBOUNCE_MS);
  };

  const reflectClientToolResult = async (result: ClientToolResultSubmission, toolName: string) => {
    if (result.error_text != null) {
      await chat.addToolOutput({
        tool: toolName,
        toolCallId: result.tool_call_id,
        state: 'output-error',
        errorText: result.error_text,
      });
      return;
    }

    await chat.addToolOutput({
      tool: toolName,
      toolCallId: result.tool_call_id,
      output: result.output,
    });
  };

  const executeClientToolCall = (event: ClientToolCallEvent) => {
    const execution = (async () => {
      let result: ClientToolResultSubmission;
      try {
        const executionResult = await onClientToolCall?.(event);
        result = executionResult
          ? mapClientToolResult(executionResult)
          : buildUnavailableToolResult(event);
      } catch (error) {
        result = {
          tool_call_id: event.toolCallId,
          error_text: error instanceof Error ? error.message : String(error),
        };
      }

      pendingClientToolResultsRef.current.push(result);
      // 将工具调用结果反映到前端 UI。
      try {
        await reflectClientToolResult(result, event.toolName);
      } catch {
        // 即使反映前端 UI 失败，recover 请求仍然继续执行，因此静默处理。
      }
    })();

    inFlightClientToolExecutionsRef.current.add(execution);
    void execution.finally(() => {
      inFlightClientToolExecutionsRef.current.delete(execution);
    });
  };

  const chat = useChat<WisePenUIMessage>({
    experimental_throttle: CHAT_STREAM_THROTTLE_MS,
    transport: new WisePenChatTransport<WisePenUIMessage>({
      api: '/chat/completions',
      fetch: fetchChatCompletion,
    }),
    onToolCall: ({ toolCall }) => {
      const event = mapClientToolCall(activeToolSessionIdRef.current || sessionId, toolCall);
      if (!event) return;
      if (handledClientToolCallIdsRef.current.has(event.toolCallId)) return;

      handledClientToolCallIdsRef.current.add(event.toolCallId);
      executeClientToolCall(event);
    },
    onFinish: () => {
      scheduleClientToolRecovery();
    },
  });

  const flushPendingClientToolExecutions = async () => {
    if (recoveringClientToolsRef.current) return;
    if (
      pendingClientToolResultsRef.current.length === 0 &&
      inFlightClientToolExecutionsRef.current.size === 0
    ) {
      return;
    }

    recoveringClientToolsRef.current = true;
    try {
      await waitForCurrentStreamRelease();

      while (
        pendingClientToolResultsRef.current.length > 0 ||
        inFlightClientToolExecutionsRef.current.size > 0
      ) {
        const recoverSessionId = activeToolSessionIdRef.current || sessionId;
        if (!recoverSessionId) return;

        while (inFlightClientToolExecutionsRef.current.size > 0) {
          await Promise.allSettled([...inFlightClientToolExecutionsRef.current]);
        }

        const clientToolResults = pendingClientToolResultsRef.current;
        pendingClientToolResultsRef.current = [];
        if (clientToolResults.length === 0) continue;

        await chat.resumeStream({
          body: {
            session_id: recoverSessionId,
            client_tool_results: clientToolResults,
            tool_approval_status: [],
          },
        });
        await waitForCurrentStreamRelease();
      }
    } finally {
      recoveringClientToolsRef.current = false;
      if (
        pendingClientToolResultsRef.current.length > 0 ||
        inFlightClientToolExecutionsRef.current.size > 0
      ) {
        scheduleClientToolRecovery();
      }
    }
  };

  const sendSessionMessage = async (query: string, options?: SendSessionMessageOptions) => {
    const requestBody = mapChatCompletionRequest({
      defaultSessionId: sessionId,
      defaultModel: model,
      query,
      options,
    });
    activeToolSessionIdRef.current = requestBody.session_id;
    handledClientToolCallIdsRef.current.clear();
    pendingClientToolResultsRef.current = [];
    inFlightClientToolExecutionsRef.current.clear();

    // 仅用于当次会话 UI；历史回放待后端 listHistoryMessages 透出 metadata。
    const uploadedAttachmentSnapshots = (options?.uploadedAttachments ?? [])
      .filter((attachment) => attachment.enabled)
      .map((attachment) => ({
        attachmentId: attachment.attachmentId,
        filename: attachment.filename,
        kind: 'temporary' as const,
        available: true,
      }));
    const resourceAttachmentSnapshots = (options?.selectedResources ?? [])
      .filter((resource) => resource.enabled)
      .map((resource) => ({
        attachmentId: resource.resourceId,
        filename: resource.resourceName,
        kind: 'resource' as const,
        available: true,
      }));
    const selectedAttachments = [...resourceAttachmentSnapshots, ...uploadedAttachmentSnapshots];
    const metadata: ChatMessageMetadata = {
      createdAt: new Date().toISOString(),
      ...(selectedAttachments.length > 0 ? { selectedAttachments } : {}),
    };
    await chat.sendMessage({ text: query, metadata }, { body: requestBody });
  };

  return {
    ...chat,
    sendSessionMessage,
  };
};
