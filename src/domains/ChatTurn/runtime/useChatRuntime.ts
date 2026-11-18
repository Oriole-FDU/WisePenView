import type { ChatStatus } from 'ai';

import { useChatTurnService } from '@/domains';

import type { WisePenUIMessage } from '../entity/message';
import type { UseChatToolApprovalResult } from './approval/useChatToolApproval';
import { useChatToolApproval } from './approval/useChatToolApproval';
import type { UseConnectActionsResult } from './connect/useConnectActions';
import { useConnectActions } from './connect/useConnectActions';
import { useConnectFsm } from './connect/useConnectFsm';
import { useConnectResume } from './connect/useConnectResume';
import type { UseChatHistoryResult } from './history/useChatHistory';
import { useChatHistory } from './history/useChatHistory';
import { hasRenderableChatContent } from './message/chatTurnModel';
import { useChatMessage } from './message/useChatMessage';

export interface UseChatRuntimeOptions {
  sessionId: string;
  model?: string;
  /** 壳层认定的「本页刚创建」会话；为 true 时 History 跳过首载。 */
  isNewSession: boolean;
  onError?: (error: Error) => void;
}

export interface UseChatRuntimeResult {
  approval: UseChatToolApprovalResult;
  messages: WisePenUIMessage[];
  /** 消息列表是否存在可渲染内容（非空文本/思考，或工具调用）。 */
  renderable: boolean;
  status: ChatStatus;
  stopConnect: UseConnectActionsResult['stopConnect'];
  send: UseConnectActionsResult['send'];
  cancel: UseConnectActionsResult['cancel'];
  cancelling: boolean;
  submitToolApprovals: UseConnectActionsResult['submitToolApprovals'];
  resumeTurn: () => Promise<void>;
  history: UseChatHistoryResult;
}

/**
 * ChatTurn Runtime 组装根：connect（开停流 + resume + 审批续跑）+ message 泵 + history + approval；
 * 组装根只接线，不内联 send/cancel/审批选路。
 */
export function useChatRuntime({
  sessionId,
  model,
  isNewSession,
  onError,
}: UseChatRuntimeOptions): UseChatRuntimeResult {
  const chatTurnService = useChatTurnService();
  const message = useChatMessage({ onError });
  const connect = useConnectFsm();

  const { resumeTurn, clearResumedTurn, invalidateResume } = useConnectResume({
    sessionId,
    connect,
    pumpResume: message.pumpResume,
    onError,
  });

  const { stopConnect, send, cancel, cancelling, submitToolApprovals } = useConnectActions({
    sessionId,
    model,
    chatTurnService,
    connect,
    message,
    clearResumedTurn,
    resumeTurn,
  });

  /** 切会话：中止旧泵并作废 resume 世代；不标 closed（后台 turn 仍可恢复）。 */
  const releaseSession = () => {
    message.stop();
    invalidateResume();
  };

  const history = useChatHistory({
    sessionId: sessionId || null,
    isNewSession,
    setMessages: message.setMessages,
    resumeTurnStream: resumeTurn,
    stop: releaseSession,
  });

  const approval = useChatToolApproval({
    sessionId,
    messages: message.messages,
    status: message.status,
    submitToolApprovals,
  });

  return {
    approval,
    messages: message.messages,
    renderable: hasRenderableChatContent(message.messages),
    status: message.status,
    stopConnect,
    send,
    cancel,
    cancelling,
    submitToolApprovals,
    resumeTurn,
    history,
  };
}
