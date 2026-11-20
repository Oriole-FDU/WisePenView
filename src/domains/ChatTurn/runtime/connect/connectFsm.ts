/**
 * 本地 SSE 连接相位（非 hook）。
 */
export const CONNECT_PHASE = {
  idle: 'idle',
  connecting: 'connecting',
  open: 'open',
  closed: 'closed',
} as const;

export type ConnectPhase = (typeof CONNECT_PHASE)[keyof typeof CONNECT_PHASE];

export type ContinuationAction = 'respond' | 'respond_resume' | 'recover';

export function resolveContinuation(input: {
  phase: ConnectPhase;
  activeTurnId: string | null;
}): ContinuationAction {
  const { phase, activeTurnId } = input;

  if (phase === CONNECT_PHASE.open || phase === CONNECT_PHASE.connecting) {
    return 'respond';
  }

  return activeTurnId ? 'respond_resume' : 'recover';
}

export interface ConnectFsm {
  getPhase: () => ConnectPhase;
  isLive: () => boolean;
  resolveContinuation: (activeTurnId: string | null) => ContinuationAction;
  beginConnect: () => void;
  markOpen: () => void;
  markIdle: () => void;
  markIdleIfOpen: () => boolean;
  markClosed: () => void;
  reset: () => void;
}

export function createConnectFsm(initial: ConnectPhase = CONNECT_PHASE.idle): ConnectFsm {
  let phase = initial;

  const setPhase = (next: ConnectPhase) => {
    phase = next;
  };

  const isLive = () => phase === CONNECT_PHASE.connecting || phase === CONNECT_PHASE.open;

  return {
    getPhase: () => phase,
    isLive,
    resolveContinuation: (activeTurnId) => resolveContinuation({ phase, activeTurnId }),
    beginConnect: () => {
      setPhase(CONNECT_PHASE.connecting);
    },
    markOpen: () => {
      setPhase(CONNECT_PHASE.open);
    },
    markIdle: () => {
      setPhase(CONNECT_PHASE.idle);
    },
    markIdleIfOpen: () => {
      if (phase !== CONNECT_PHASE.open) return false;
      setPhase(CONNECT_PHASE.idle);
      return true;
    },
    markClosed: () => {
      setPhase(CONNECT_PHASE.closed);
    },
    reset: () => {
      setPhase(CONNECT_PHASE.idle);
    },
  };
}
