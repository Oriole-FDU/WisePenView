import { createContext } from 'react';

import type { ModalRootControlContextValue } from '../index.type';

export const ModalRootControlContext = createContext<ModalRootControlContextValue | null>(null);
