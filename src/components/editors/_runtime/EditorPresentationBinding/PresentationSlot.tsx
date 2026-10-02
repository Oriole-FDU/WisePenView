import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { type StoreApi, useStore } from 'zustand';

import styles from './style.module.less';

export interface PresentationSlotState {
  container: HTMLElement | null;
  setContainer(container: HTMLElement | null): void;
}

export function PresentationSlotTarget({
  store,
  fill,
}: {
  store: StoreApi<PresentationSlotState>;
  fill: boolean;
}) {
  const setContainer = useStore(store, (state) => state.setContainer);
  return fill ? (
    <div ref={setContainer} className={styles.panelSlot} />
  ) : (
    <span ref={setContainer} className={styles.slot} />
  );
}

export function PresentationSlotPortal({
  store,
  children,
}: {
  store: StoreApi<PresentationSlotState>;
  children: ReactNode;
}) {
  const container = useStore(store, (state) => state.container);
  return container ? createPortal(children, container) : null;
}
