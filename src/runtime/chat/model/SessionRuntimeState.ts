import type { WisePenError } from '@/utils/error';

import type { SessionPhase, SessionVisibility } from '../_common';

export type SessionRuntimeSnapshot = {
  readonly sessionId: string;
  readonly visibility: SessionVisibility;
  readonly phase: SessionPhase;
  readonly error: WisePenError | undefined;
};

export type SessionRuntimeStateUpdate = {
  visibility?: SessionVisibility;
  phase?: SessionPhase;
  error?: WisePenError | undefined;
};

export class SessionRuntimeState {
  readonly sessionId: string;
  visibility: SessionVisibility = 'background';
  phase: SessionPhase = 'idle';
  error: WisePenError | undefined;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  update(update: SessionRuntimeStateUpdate): void {
    if (update.visibility !== undefined) this.visibility = update.visibility;
    if (update.phase !== undefined) this.phase = update.phase;
    if ('error' in update) this.error = update.error;
  }

  snapshot(): SessionRuntimeSnapshot {
    return {
      sessionId: this.sessionId,
      visibility: this.visibility,
      phase: this.phase,
      error: this.error,
    };
  }
}
