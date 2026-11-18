import { useFsm } from '@/utils/fsm';

export const MESSAGE_LOADING_PHASE = {
  idle: 'idle',
  replace: 'replace',
  prepend: 'prepend',
} as const;

export type MessageLoadingPhase =
  (typeof MESSAGE_LOADING_PHASE)[keyof typeof MESSAGE_LOADING_PHASE];

export interface ChatMessageLoadingActions {
  beginReplaceLoad: () => void;
  endReplaceLoad: () => void;
  beginPrependLoad: () => boolean;
  endPrependLoad: () => void;
  resetLoading: () => void;
}

export interface UseChatMessageControlResult extends ChatMessageLoadingActions {
  loadingInitial: boolean;
  loadingMore: boolean;
}

export function useChatMessageControl(): UseChatMessageControlResult {
  const fsm = useFsm<MessageLoadingPhase>(MESSAGE_LOADING_PHASE.idle);

  const beginReplaceLoad = () => {
    fsm.transitionTo(MESSAGE_LOADING_PHASE.replace);
  };

  const endReplaceLoad = () => {
    fsm.transitionIf(MESSAGE_LOADING_PHASE.replace, MESSAGE_LOADING_PHASE.idle);
  };

  const beginPrependLoad = (): boolean => {
    return fsm.transitionIf(MESSAGE_LOADING_PHASE.idle, MESSAGE_LOADING_PHASE.prepend);
  };

  const endPrependLoad = () => {
    fsm.transitionIf(MESSAGE_LOADING_PHASE.prepend, MESSAGE_LOADING_PHASE.idle);
  };

  const resetLoading = () => {
    fsm.transitionTo(MESSAGE_LOADING_PHASE.idle);
  };

  return {
    loadingInitial: fsm.phase === MESSAGE_LOADING_PHASE.replace,
    loadingMore: fsm.phase === MESSAGE_LOADING_PHASE.prepend,
    beginReplaceLoad,
    endReplaceLoad,
    beginPrependLoad,
    endPrependLoad,
    resetLoading,
  };
}
