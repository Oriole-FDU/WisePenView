import { createContext } from 'react';

import type { ServicesContextValue } from './registry.types';

export const ServicesContext = createContext<ServicesContextValue | null>(null);
