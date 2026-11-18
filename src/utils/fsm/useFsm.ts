import { useRef, useState } from 'react';

import { createFsm, type Fsm } from './createFsm';

export type UseFsmResult<TPhase extends string> = Fsm<TPhase> & {
  phase: TPhase;
};

export function useFsm<TPhase extends string>(initial: TPhase): UseFsmResult<TPhase> {
  const fsmRef = useRef(createFsm(initial));
  const [phase, setPhase] = useState(initial);

  const getPhase = () => fsmRef.current.getPhase();
  const is = (expected: TPhase) => fsmRef.current.is(expected);

  const transitionTo = (next: TPhase) => {
    fsmRef.current.transitionTo(next);
    setPhase(next);
  };

  const transitionIf = (from: TPhase, to: TPhase): boolean => {
    const ok = fsmRef.current.transitionIf(from, to);
    if (ok) setPhase(to);
    return ok;
  };

  return {
    phase,
    getPhase,
    is,
    transitionTo,
    transitionIf,
  };
}
