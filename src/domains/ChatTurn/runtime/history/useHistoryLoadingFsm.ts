import { useFsm } from '@/utils/fsm';

export const HISTORY_LOADING_PHASE = {
  idle: 'idle',
  replace: 'replace',
  prepend: 'prepend',
} as const;

export type HistoryLoadingPhase =
  (typeof HISTORY_LOADING_PHASE)[keyof typeof HISTORY_LOADING_PHASE];

export interface HistoryLoadingActions {
  beginReplaceLoad: () => void;
  endReplaceLoad: () => void;
  beginPrependLoad: () => boolean;
  endPrependLoad: () => void;
  resetLoading: () => void;
}

export interface UseHistoryLoadingFsmResult extends HistoryLoadingActions {
  loadingInitial: boolean;
  loadingMore: boolean;
}

export function useHistoryLoadingFsm(): UseHistoryLoadingFsmResult {
  const fsm = useFsm<HistoryLoadingPhase>(HISTORY_LOADING_PHASE.idle);

  const beginReplaceLoad = () => {
    fsm.transitionTo(HISTORY_LOADING_PHASE.replace);
  };

  const endReplaceLoad = () => {
    fsm.transitionIf(HISTORY_LOADING_PHASE.replace, HISTORY_LOADING_PHASE.idle);
  };

  const beginPrependLoad = (): boolean => {
    return fsm.transitionIf(HISTORY_LOADING_PHASE.idle, HISTORY_LOADING_PHASE.prepend);
  };

  const endPrependLoad = () => {
    fsm.transitionIf(HISTORY_LOADING_PHASE.prepend, HISTORY_LOADING_PHASE.idle);
  };

  const resetLoading = () => {
    fsm.transitionTo(HISTORY_LOADING_PHASE.idle);
  };

  return {
    loadingInitial: fsm.phase === HISTORY_LOADING_PHASE.replace,
    loadingMore: fsm.phase === HISTORY_LOADING_PHASE.prepend,
    beginReplaceLoad,
    endReplaceLoad,
    beginPrependLoad,
    endPrependLoad,
    resetLoading,
  };
}
