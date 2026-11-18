/**
 * 维护 Chat 流连接相位，并据此判定审批续传动作。
 */
import { useFsm } from '@/utils/fsm';

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

export interface UseConnectFsmResult {
  phase: ConnectPhase;
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

export function useConnectFsm(): UseConnectFsmResult {
  const fsm = useFsm<ConnectPhase>(CONNECT_PHASE.idle);

  const isLive = () => {
    const phase = fsm.getPhase();
    return phase === CONNECT_PHASE.connecting || phase === CONNECT_PHASE.open;
  };

  return {
    phase: fsm.phase,
    getPhase: fsm.getPhase,
    isLive,
    resolveContinuation: (activeTurnId) =>
      resolveContinuation({ phase: fsm.getPhase(), activeTurnId }),
    beginConnect: () => {
      fsm.transitionTo(CONNECT_PHASE.connecting);
    },
    markOpen: () => {
      fsm.transitionTo(CONNECT_PHASE.open);
    },
    markIdle: () => {
      fsm.transitionTo(CONNECT_PHASE.idle);
    },
    markIdleIfOpen: () => {
      return fsm.transitionIf(CONNECT_PHASE.open, CONNECT_PHASE.idle);
    },
    markClosed: () => {
      fsm.transitionTo(CONNECT_PHASE.closed);
    },
    reset: () => {
      fsm.transitionTo(CONNECT_PHASE.idle);
    },
  };
}
