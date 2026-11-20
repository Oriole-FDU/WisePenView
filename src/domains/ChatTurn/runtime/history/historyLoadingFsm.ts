/**
 * 历史加载相位：首屏替换与向前翻页互斥。
 */
export const HISTORY_LOADING_PHASE = {
  idle: 'idle',
  replace: 'replace',
  prepend: 'prepend',
} as const;

export type HistoryLoadingPhase =
  (typeof HISTORY_LOADING_PHASE)[keyof typeof HISTORY_LOADING_PHASE];

export interface HistoryLoadingFsm {
  loadingInitial: boolean;
  loadingMore: boolean;
  beginReplaceLoad: () => void;
  endReplaceLoad: () => void;
  beginPrependLoad: () => boolean;
  endPrependLoad: () => void;
  resetLoading: () => void;
}

export function createHistoryLoadingFsm(): HistoryLoadingFsm {
  let phase: HistoryLoadingPhase = HISTORY_LOADING_PHASE.idle;

  return {
    get loadingInitial() {
      return phase === HISTORY_LOADING_PHASE.replace;
    },
    get loadingMore() {
      return phase === HISTORY_LOADING_PHASE.prepend;
    },
    beginReplaceLoad: () => {
      phase = HISTORY_LOADING_PHASE.replace;
    },
    endReplaceLoad: () => {
      if (phase === HISTORY_LOADING_PHASE.replace) {
        phase = HISTORY_LOADING_PHASE.idle;
      }
    },
    beginPrependLoad: () => {
      if (phase !== HISTORY_LOADING_PHASE.idle) return false;
      phase = HISTORY_LOADING_PHASE.prepend;
      return true;
    },
    endPrependLoad: () => {
      if (phase === HISTORY_LOADING_PHASE.prepend) {
        phase = HISTORY_LOADING_PHASE.idle;
      }
    },
    resetLoading: () => {
      phase = HISTORY_LOADING_PHASE.idle;
    },
  };
}
