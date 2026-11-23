import type { WisePenError } from '@/utils/error';

import type { SessionPhase, SessionVisibility } from '../_common';

export type SessionRuntimeSnapshot = {
  readonly sessionId: string;
  readonly visibility: SessionVisibility;
  readonly phase: SessionPhase;
  readonly error: WisePenError | undefined;
  readonly historyPage: number;
  readonly historyTotalPage: number;
  readonly historyLoadingMore: boolean;
};

export type SessionRuntimeStateUpdate = {
  visibility?: SessionVisibility;
  phase?: SessionPhase;
  error?: WisePenError | undefined;
  historyPage?: number;
  historyTotalPage?: number;
  historyLoadingMore?: boolean;
};

export class SessionRuntimeState {
  readonly sessionId: string;
  visibility: SessionVisibility = 'background';
  phase: SessionPhase = 'idle';
  error: WisePenError | undefined;
  historyPage = 1;
  historyTotalPage = 1;
  historyLoadingMore = false;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  update(update: SessionRuntimeStateUpdate): void {
    if (update.visibility !== undefined) this.visibility = update.visibility;
    if (update.phase !== undefined) this.phase = update.phase;
    if ('error' in update) this.error = update.error;
    if (update.historyPage !== undefined) this.historyPage = update.historyPage;
    if (update.historyTotalPage !== undefined) this.historyTotalPage = update.historyTotalPage;
    if (update.historyLoadingMore !== undefined) {
      this.historyLoadingMore = update.historyLoadingMore;
    }
  }

  snapshot(): SessionRuntimeSnapshot {
    return {
      sessionId: this.sessionId,
      visibility: this.visibility,
      phase: this.phase,
      error: this.error,
      historyPage: this.historyPage,
      historyTotalPage: this.historyTotalPage,
      historyLoadingMore: this.historyLoadingMore,
    };
  }
}
