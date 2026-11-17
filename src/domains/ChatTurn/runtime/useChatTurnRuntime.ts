import { useLatest, useMemoizedFn, useUnmount } from 'ahooks';
import { useEffect, useRef, useState } from 'react';

import { captureException } from '@/observability';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { ChatRecoverApiRequest } from '../apis/ChatStreamApi.schema';
import { mapChatTurnRequest } from '../mapper/chatTurn.mapper';
import type {
  SendTurnMessageOptions,
  ToolApprovalStatusRequest,
  UseChatTurnRuntimeOptions,
} from '../service/index.type';
import { type LocalStream, resolveContinuation } from './resolveContinuation';
import { useChatMessagePipeline } from './useChatMessagePipeline';

export type ChatTurnStatus = 'ready' | 'submitted' | 'streaming' | 'error';

interface StreamState {
  sessionId: string;
  localStream: LocalStream;
  lastError: unknown;
}

/** Runtime 拥有本地流状态、续跑策略和重连去重；消息组装和传输由 Pipeline 执行。 */
export function useChatTurnRuntime({
  sessionId,
  model,
  getActiveTurnId,
  respondChatTurn,
  streamChatCompletion,
  recoverChatStream,
  reconnectChatStream,
  onError,
}: UseChatTurnRuntimeOptions) {
  const pipeline = useChatMessagePipeline({
    streamChatCompletion,
    recoverChatStream,
    reconnectChatStream,
  });
  const [streamState, setStreamState] = useState<StreamState>({
    sessionId,
    localStream: 'idle',
    lastError: null,
  });
  const stateRef = useRef(streamState);
  const generationRef = useRef(0);
  const resumeRequestRef = useRef<{
    sessionId: string;
    generation: number;
    promise: Promise<void>;
  } | null>(null);
  const resumedTurnRef = useRef<{ sessionId: string; turnId: string; generation: number } | null>(
    null
  );
  const latestSessionId = useLatest(sessionId);
  const latestOnError = useLatest(onError);

  const updateStream = (next: StreamState) => {
    stateRef.current = next;
    setStreamState(next);
  };
  const invalidateResumeState = () => {
    generationRef.current += 1;
    resumeRequestRef.current = null;
    resumedTurnRef.current = null;
  };
  // History 的 effect 以函数身份管理订阅 cleanup，停止能力必须稳定且读取最新管线。
  const stopLocalStream = useMemoizedFn(() => {
    invalidateResumeState();
    pipeline.stop();
    updateStream({ ...stateRef.current, localStream: 'closed' });
  });

  /**
   * @wisepen-manual-effect
   * 执行时机：路由切换会话时使旧流与重连请求失效，重置本地状态。
   * 不可替代原因：会话由外部路由声明式驱动，无法只靠发送和取消事件覆盖。
   * cleanup：卸载由 useUnmount 停止管线；新建会话升级为本次发送的目标 ID 时保留连接。
   */
  useEffect(() => {
    if (stateRef.current.sessionId === sessionId) return;
    stopLocalStream();
    const next: StreamState = { sessionId, localStream: 'idle', lastError: null };
    stateRef.current = next;
    setStreamState(next);
  }, [sessionId, stopLocalStream]);
  useUnmount(() => stopLocalStream());

  const isCurrent = (generation: number, targetSessionId: string, originSessionId: string) =>
    generationRef.current === generation &&
    (latestSessionId.current === targetSessionId || latestSessionId.current === originSessionId);

  const runStream = async (
    targetSessionId: string,
    pump: (onOpen: () => void) => Promise<'idle' | 'closed'>,
    onConnected?: () => void
  ) => {
    const generation = generationRef.current;
    const originSessionId = sessionId;
    updateStream({ sessionId: targetSessionId, localStream: 'connecting', lastError: null });
    try {
      const localStream = await pump(() => {
        if (isCurrent(generation, targetSessionId, originSessionId)) {
          updateStream({ sessionId: targetSessionId, localStream: 'open', lastError: null });
          onConnected?.();
        }
      });
      if (isCurrent(generation, targetSessionId, originSessionId)) {
        updateStream({ sessionId: targetSessionId, localStream, lastError: null });
      }
    } catch (error) {
      if (!isCurrent(generation, targetSessionId, originSessionId)) return;
      updateStream({ sessionId: targetSessionId, localStream: 'closed', lastError: error });
      throw error;
    }
  };

  const resumeLocalStream = (): Promise<void> => {
    if (!sessionId) return Promise.resolve();
    const generation = generationRef.current;
    const existing = resumeRequestRef.current;
    if (existing?.sessionId === sessionId && existing.generation === generation)
      return existing.promise;
    if (stateRef.current.localStream === 'open' || stateRef.current.localStream === 'connecting')
      return Promise.resolve();
    const targetSessionId = sessionId;
    let markConnected: () => void = () => undefined;
    const promise = new Promise<void>((resolve) => {
      markConnected = resolve;
    });
    const request = { sessionId, generation, promise };
    resumeRequestRef.current = request;
    void (async () => {
      try {
        const turnId = await getActiveTurnId(targetSessionId);
        if (!isCurrent(generation, targetSessionId, targetSessionId) || !turnId) return;
        const resumed = resumedTurnRef.current;
        if (
          resumed?.sessionId === targetSessionId &&
          resumed.turnId === turnId &&
          resumed.generation === generation
        )
          return;
        if (
          stateRef.current.localStream === 'open' ||
          stateRef.current.localStream === 'connecting'
        )
          return;
        resumedTurnRef.current = { sessionId: targetSessionId, turnId, generation };
        await runStream(
          targetSessionId,
          (onOpen) => pipeline.resumeStream(targetSessionId, onOpen),
          markConnected
        );
      } catch (error) {
        if (!isCurrent(generation, targetSessionId, targetSessionId)) return;
        updateStream({ sessionId: targetSessionId, localStream: 'closed', lastError: error });
        captureException(error, { detector: 'application-handled', operation: 'chat.resume' });
        if (error instanceof Error) latestOnError.current?.(error);
      } finally {
        // 无 active、取消或建连失败也必须释放等待者；连接后的泵继续由 Runtime 管理。
        markConnected();
        // 仅合并在途请求，完成或失败后允许重新查询；旧请求不能清除新生命周期的缓存。
        if (resumeRequestRef.current === request) {
          resumeRequestRef.current = null;
          resumedTurnRef.current = null;
        }
      }
    })();
    return request.promise;
  };

  const sendTurnMessage = async (query: string, options?: SendTurnMessageOptions) => {
    const requestBody = mapChatTurnRequest({
      defaultSessionId: sessionId,
      defaultModel: model,
      query,
      options,
    });
    invalidateResumeState();
    await runStream(requestBody.session_id, (onOpen) =>
      pipeline.sendTurnMessage(query, options, requestBody, onOpen)
    );
  };

  const submitToolApprovals = async (toolApprovalStatus: ToolApprovalStatusRequest[]) => {
    const generation = generationRef.current;
    try {
      if (!sessionId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: '提交工具审批时缺少 session_id',
        });
      }
      const requestBody: ChatRecoverApiRequest = {
        session_id: sessionId,
        client_tool_results: [],
        tool_approval_status: toolApprovalStatus,
      };
      const localStream = stateRef.current.localStream;
      const activeTurnId =
        localStream === 'open' || localStream === 'connecting'
          ? null
          : await getActiveTurnId(sessionId);
      if (!isCurrent(generation, sessionId, sessionId)) return;
      // 查询期间可能已由历史重连开流，按最新本地状态选路。
      const action = resolveContinuation({
        localStream: stateRef.current.localStream,
        activeTurnId,
      });
      if (action === 'recover') {
        invalidateResumeState();
        await new Promise<void>((resolve, reject) => {
          let connected = false;
          void runStream(
            sessionId,
            (onOpen) => pipeline.pumpSend(undefined, requestBody, onOpen),
            () => {
              connected = true;
              resolve();
            }
          )
            .then(resolve)
            .catch((error: unknown) => {
              if (!connected) {
                reject(error);
                return;
              }
              captureException(error, {
                detector: 'application-handled',
                operation: 'chat.stream',
              });
              if (error instanceof Error) latestOnError.current?.(error);
            });
        });
      } else {
        await respondChatTurn(requestBody);
        if (action === 'respond_and_resume' && isCurrent(generation, sessionId, sessionId)) {
          await resumeLocalStream();
        }
      }
    } catch (error) {
      captureException(error, {
        detector: 'application-handled',
        operation: 'chat.submitApprovals',
      });
      throw error;
    }
  };

  const { localStream, lastError } = streamState;
  const status: ChatTurnStatus =
    localStream === 'connecting'
      ? 'submitted'
      : localStream === 'open'
        ? 'streaming'
        : lastError
          ? 'error'
          : 'ready';
  return {
    messages: pipeline.messages,
    setMessages: pipeline.setMessages,
    localStream,
    lastError,
    status,
    uiBusy: localStream === 'connecting' || localStream === 'open',
    sendTurnMessage,
    submitToolApprovals,
    resumeLocalStream,
    stopLocalStream,
  };
}
