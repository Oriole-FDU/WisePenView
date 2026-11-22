import { useChat } from '@ai-sdk/react';
import { useMemoizedFn } from 'ahooks';
import { DefaultChatTransport } from 'ai';
import { useMemo, useRef } from 'react';

import { buildApiUrl } from '@/apis/buildApiUrl';
import type { ChatMessageMetadata, WisePenUIMessage } from '@/domains/ChatSession';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { ChatRecoverApiRequest } from '../apis/ChatStreamApi.schema';
import {
  pickChatCompletionApiRequest,
  pickChatRecoverApiRequest,
} from '../apis/ChatStreamApi.schema';
import type { SendTurnMessageOptions, UseChatTurnRuntimeOptions } from '../service/index.type';
import { normalizeChatSseResponse } from './chatSseNormalizer';

const CHAT_STREAM_THROTTLE_MS = 50;

function resolveChatApiUrl(input: RequestInfo | URL): string {
  return typeof input === 'string' || input instanceof URL
    ? new URL(input.toString(), buildApiUrl('/')).toString()
    : input.url;
}

async function fetchChatCompletion(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  streamApi: Pick<
    UseChatTurnRuntimeOptions,
    'streamChatCompletion' | 'recoverChatStream' | 'reconnectChatStream'
  >
): Promise<Response> {
  const requestUrl = new URL(resolveChatApiUrl(input));
  const rawBody = typeof init?.body === 'string' ? JSON.parse(init.body) : {};

  const response = requestUrl.pathname.endsWith('/chat/completions/recover')
    ? await streamApi.recoverChatStream(
        pickChatRecoverApiRequest(rawBody),
        init?.signal ?? undefined
      )
    : requestUrl.pathname.endsWith('/chat/completions/stream')
      ? await streamApi.reconnectChatStream(
          requestUrl.searchParams.get('session_id') ?? '',
          init?.signal ?? undefined
        )
      : await streamApi.streamChatCompletion(
          pickChatCompletionApiRequest(rawBody),
          init?.signal ?? undefined
        );

  return response;
}

function isChatRecoverRequest(
  body: Record<string, unknown> | undefined
): body is ChatRecoverApiRequest {
  return (
    typeof body?.session_id === 'string' &&
    Array.isArray(body.client_tool_results) &&
    Array.isArray(body.tool_approval_status)
  );
}

const createChatTransport = (
  fetchStream: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
) =>
  new DefaultChatTransport<WisePenUIMessage>({
    api: '/chat/completions',
    fetch: fetchStream,
    prepareSendMessagesRequest: ({ body }) => {
      if (isChatRecoverRequest(body)) {
        return { api: '/chat/completions/recover', body };
      }
      return { body: body ?? {} };
    },
    prepareReconnectToStreamRequest: ({ body }) => {
      const sessionId = body?.session_id;
      if (typeof sessionId !== 'string' || sessionId === '') {
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: '重连聊天流时缺少 session_id',
        });
      }
      const params = new URLSearchParams({ session_id: sessionId });
      return { api: `/chat/completions/stream?${params.toString()}` };
    },
  });

interface PumpOperation {
  controller: AbortController;
  onOpen: () => void;
  promise: Promise<'idle' | 'closed'>;
  error?: Error;
  closed: boolean;
}

type PipelineOptions = Pick<
  UseChatTurnRuntimeOptions,
  'streamChatCompletion' | 'recoverChatStream' | 'reconnectChatStream'
>;

/** 只负责消息缓冲和传输；泵的结果交给 Runtime，不导出 SDK 状态或协议决策。 */
export function useChatMessagePipeline(streamApi: PipelineOptions) {
  const activeRef = useRef<PumpOperation | null>(null);
  const sdkOperationRef = useRef<PumpOperation | null>(null);
  const { streamChatCompletion, recoverChatStream, reconnectChatStream } = streamApi;
  // transport 长期持有 fetch 回调，稳定身份并读取当前泵与最新服务。
  const fetchStream = useMemoizedFn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const operation = sdkOperationRef.current;
    if (!operation) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: '聊天传输缺少本地泵',
      });
    }
    const signal = init?.signal
      ? AbortSignal.any([init.signal, operation.controller.signal])
      : operation.controller.signal;
    signal.throwIfAborted();
    const response = await fetchChatCompletion(
      input,
      { ...init, signal },
      {
        streamChatCompletion,
        recoverChatStream,
        reconnectChatStream,
      }
    );
    if (signal.aborted) {
      void response.body?.cancel().catch(() => undefined);
      signal.throwIfAborted();
    }
    if (!response.body) return response;
    // SDK 重连不传 abortSignal，额外让响应体跟随本地泵取消。
    const abortableResponse = new Response(
      response.body.pipeThrough(new TransformStream(), { signal }),
      {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      }
    );
    if (response.ok) operation.onOpen();
    return normalizeChatSseResponse(abortableResponse);
  });
  /**
   * @wisepen-manual-memo
   * 为什么：SDK 持有 transport 实例，必须让 fetch 与泵的取消资源保持同一身份。
   * 收益：同一消息管线持续复用传输实例，重连建立前也能被中止。
   * 失效条件：稳定传输回调的身份发生变化。
   */
  const transport = useMemo(() => createChatTransport(fetchStream), [fetchStream]);
  const chat = useChat<WisePenUIMessage>({
    experimental_throttle: CHAT_STREAM_THROTTLE_MS,
    transport,
    onError: (error) => {
      const operation = sdkOperationRef.current;
      if (operation) operation.error = error;
    },
    onFinish: ({ isAbort, isDisconnect, isError }) => {
      const operation = sdkOperationRef.current;
      if (operation) operation.closed = isAbort || isDisconnect || isError;
    },
  });

  const stop = () => {
    activeRef.current?.controller.abort();
    sdkOperationRef.current?.controller.abort();
    void chat.stop();
  };

  const pump = (action: () => Promise<unknown>, onOpen: () => void) => {
    const previous = activeRef.current;
    // 旧 SDK 回调排空后再启动新泵，避免旧 onFinish 结束新连接。
    stop();
    const operation: PumpOperation = {
      controller: new AbortController(),
      onOpen,
      promise: Promise.resolve('closed'),
      closed: false,
    };
    operation.promise = (async () => {
      try {
        await previous?.promise.catch(() => undefined);
        if (operation.controller.signal.aborted) return 'closed';
        sdkOperationRef.current = operation;
        await action();
        if (operation.controller.signal.aborted) return 'closed';
        if (operation.error) throw operation.error;
        return operation.closed ? 'closed' : 'idle';
      } catch (error) {
        if (operation.controller.signal.aborted) return 'closed';
        throw error;
      } finally {
        if (sdkOperationRef.current === operation) sdkOperationRef.current = null;
        if (activeRef.current === operation) activeRef.current = null;
      }
    })();
    activeRef.current = operation;
    return operation.promise;
  };

  const sendTurnMessage = (
    query: string,
    options: SendTurnMessageOptions | undefined,
    body: Record<string, unknown>,
    onOpen: () => void
  ) => {
    // 仅用于当次会话 UI；历史回放待后端 listHistoryMessages 透出 metadata
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
    return pump(() => chat.sendMessage({ text: query, metadata }, { body }), onOpen);
  };

  return {
    sendTurnMessage,
    messages: chat.messages,
    setMessages: chat.setMessages,
    pumpSend: (
      message: Parameters<typeof chat.sendMessage>[0],
      body: Record<string, unknown>,
      onOpen: () => void
    ) => pump(() => chat.sendMessage(message, { body }), onOpen),
    resumeStream: (targetSessionId: string, onOpen: () => void) =>
      pump(() => chat.resumeStream({ body: { session_id: targetSessionId } }), onOpen),
    stop,
  };
}
