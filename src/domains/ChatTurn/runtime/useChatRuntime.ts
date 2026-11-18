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
  stopConnect: UseConnectActionsResult['stopConnect'];
  send: UseConnectActionsResult['send'];
  cancel: UseConnectActionsResult['cancel'];
  cancelling: boolean;
  submitToolApprovals: UseConnectActionsResult['submitToolApprovals'];
  resumeTurn: () => Promise<void>;
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

  const releaseSession = () => {
    message.stop();
    invalidateResume();
  };

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
    stopConnect,
    send,
    cancel,
    cancelling,
    submitToolApprovals,
    resumeTurn,
    history,
  };
}
