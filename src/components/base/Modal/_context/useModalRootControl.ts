import { useContext } from 'react';

import { ModalRootControlContext } from './ModalRootControlContext';

export function useModalRootControl() {
  return useContext(ModalRootControlContext);
}
