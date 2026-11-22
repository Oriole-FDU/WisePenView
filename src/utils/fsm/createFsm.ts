export type Fsm<TPhase extends string> = {
  getPhase: () => TPhase;
  is: (expected: TPhase) => boolean;
  transitionTo: (next: TPhase) => void;
  transitionIf: (from: TPhase, to: TPhase) => boolean;
};

export function createFsm<TPhase extends string>(initial: TPhase): Fsm<TPhase> {
  let phase = initial;

  return {
    getPhase: () => phase,
    is: (expected) => phase === expected,
    transitionTo: (next) => {
      phase = next;
    },
    transitionIf: (from, to) => {
      if (phase !== from) return false;
      phase = to;
      return true;
    },
  };
}
