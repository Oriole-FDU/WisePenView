import type { ReactNode } from 'react';

import type { ModalRootControlContextValue } from '../index.type';
import { ModalRootControlContext } from './ModalRootControlContext';

export function ModalRootControlProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ModalRootControlContextValue | null;
}) {
  return (
    <ModalRootControlContext.Provider value={value}>{children}</ModalRootControlContext.Provider>
  );
}
