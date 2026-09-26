import type { ReactNode } from 'react';

import { getContextValue } from '../registry';
import { ServicesContext } from './ServicesContext';

/** 在应用根部包裹，使子组件可通过 useXxxService 获取 Service */
export function ServicesProvider({ children }: { children: ReactNode }) {
  const value = getContextValue();
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}
