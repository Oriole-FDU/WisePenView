import {
  type ChatTransport,
  parseJsonEventStream,
  type UIMessage,
  type UIMessageChunk,
  uiMessageChunkSchema,
} from 'ai';

import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

/**
 * 不发 HTTP 的 ChatTransport：只消费上层已取得的 SSE body。
 * 协议选路（completions / recover / stream）留在 Service，本类只做泵。
 */
export class PumpChatTransport<UI_MESSAGE extends UIMessage> implements ChatTransport<UI_MESSAGE> {
  private pendingSendBody: ReadableStream<Uint8Array> | null = null;
  private pendingReconnectBody: ReadableStream<Uint8Array> | null = null;

  armSend(body: ReadableStream<Uint8Array>): void {
    this.pendingSendBody = body;
  }

  armReconnect(body: ReadableStream<Uint8Array>): void {
    this.pendingReconnectBody = body;
  }

  async sendMessages({
    abortSignal,
  }: Parameters<ChatTransport<UI_MESSAGE>['sendMessages']>[0]): Promise<
    ReadableStream<UIMessageChunk>
  > {
    const body = this.pendingSendBody;
    this.pendingSendBody = null;
    if (!body) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: 'pumpSend 调用前未装配 SSE body',
      });
    }
    return this.processResponseStream(bindAbort(body, abortSignal));
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    const body = this.pendingReconnectBody;
    this.pendingReconnectBody = null;
    if (!body) {
      return null;
    }
    return this.processResponseStream(body);
  }

  private processResponseStream(
    stream: ReadableStream<Uint8Array>
  ): ReadableStream<UIMessageChunk> {
    return parseJsonEventStream({
      stream,
      schema: uiMessageChunkSchema,
    }).pipeThrough(
      new TransformStream({
        async transform(chunk, controller) {
          if (!chunk.success) {
            throw chunk.error;
          }
          controller.enqueue(chunk.value);
        },
      })
    );
  }
}

function bindAbort(
  stream: ReadableStream<Uint8Array>,
  abortSignal: AbortSignal | undefined
): ReadableStream<Uint8Array> {
  if (!abortSignal) return stream;

  const cancel = () => {
    void stream.cancel();
  };

  if (abortSignal.aborted) {
    cancel();
    return stream;
  }

  abortSignal.addEventListener('abort', cancel, { once: true });
  return stream;
}
