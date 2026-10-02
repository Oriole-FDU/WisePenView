import type { ReactNode } from 'react';
import { createStore } from 'zustand/vanilla';

import {
  PresentationSlotPortal,
  type PresentationSlotState,
  PresentationSlotTarget,
} from './PresentationSlot';

/** 宿主只挂载槽位，内容仍在编辑器子树内渲染，保留会话 Context。 */
export function createPresentationSlot(fill = false) {
  const store = createStore<PresentationSlotState>((set, get) => ({
    container: null,
    setContainer: (container) => {
      if (get().container !== container) set({ container });
    },
  }));
  return {
    target: <PresentationSlotTarget store={store} fill={fill} />,
    render: (children: ReactNode) => (
      <PresentationSlotPortal store={store}>{children}</PresentationSlotPortal>
    ),
  };
}
