import { useFsm } from '@/utils/fsm';

/** 本地 SSE 连接相位；submit / resume / recover 共用。不推断后端 turn 是否存在。 */
export const CONNECT_PHASE = {
  idle: 'idle',
  connecting: 'connecting',
  open: 'open',
  closed: 'closed',
} as const;

export type ConnectPhase = (typeof CONNECT_PHASE)[keyof typeof CONNECT_PHASE];

export type ContinuationAction = 'respond' | 'respond_resume' | 'recover';

/**
 * 审批续跑纯策略：只读 connect 相位与 active 查询结果，不碰 Service / React。
 * live → respond；idle/closed + active → respond+resume；否则 recover。
 */
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
  /** 按当前相位 + activeTurnId 选审批续跑路径。 */
  resolveContinuation: (activeTurnId: string | null) => ContinuationAction;
  beginConnect: () => void;
  markOpen: () => void;
  markIdle: () => void;
  /** 正常结束：仅 open→idle，避免覆盖 stop/错误写入的 closed。 */
  markIdleIfOpen: () => boolean;
  markClosed: () => void;
  reset: () => void;
}

/**
 * Runtime 拥有的连接状态机。
 *
 * connecting → open → idle（正常结束）
 * connecting / open → closed（stop 或错误）
 * 任意 → idle（切 session）
 */
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
