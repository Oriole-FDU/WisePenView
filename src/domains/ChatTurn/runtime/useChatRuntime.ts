/**
 * 编排单会话 ChatTurn 运行时：消息、连接、历史与工具审批。
 */
import { useMemoizedFn } from 'ahooks';
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
  isNewSession: boolean;
  onError?: (error: Error) => void;
}

export interface UseChatRuntimeResult {
  approval: UseChatToolApprovalResult;
  messages: WisePenUIMessage[];
  renderable: boolean;
  status: ChatStatus;
  send: UseConnectActionsResult['send'];
  cancel: UseConnectActionsResult['cancel'];
  cancelling: boolean;
  connectActive: boolean;
  history: UseChatHistoryResult;
}

export function useChatRuntime({
  sessionId,
  model,
  isNewSession,
  onError,
}: UseChatRuntimeOptions): UseChatRuntimeResult {
  const chatTurnService = useChatTurnService();
  const message = useChatMessage({ onError });
  const connect = useConnectFsm();

  const { resumeTurn, cancelResume } = useConnectResume({
    sessionId,
    connect,
    pumpResume: message.pumpResume,
    onError,
  });

  const { stopConnect, send, cancel, cancelling, connectActive, submitToolApprovals } =
    useConnectActions({
      sessionId,
      model,
      chatTurnService,
      connect,
      message,
      cancelResume,
      resumeTurn,
    });

  const releaseSession = useMemoizedFn(() => {
    stopConnect();
    connect.reset();
  });

  const history = useChatHistory({
    sessionId: sessionId || null,
    isNewSession,
    setMessages: message.setMessages,
    resumeTurn,
    stop: releaseSession,
    onError,
  });

  const approval = useChatToolApproval({
    sessionId,
    messages: message.messages,
    status: message.status,
    submitToolApprovals,
    onError,
  });

  return {
    approval,
    messages: message.messages,
    renderable: hasRenderableChatContent(message.messages),
    status: message.status,
    send,
    cancel,
    cancelling,
    connectActive,
    history,
  };
}
