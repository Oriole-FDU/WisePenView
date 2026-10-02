import { useSyncExternalStore } from 'react';

import { readCurrentLanguage } from '@/i18n/language';
import { registerStore } from '@/store/lifecycle';

import { readBrowserTimeContext } from './browserTime';
import type { FrontendStateKey, FrontendStateValues } from './definitions';
import { createFrontendStateRegistry } from './registry';

export type {
  FrontendStateEntry,
  FrontendStateKey,
  FrontendStateValues,
  SelectedNoteScopeValue,
  SelectedResourceReference,
  WorkspaceOpenResourceValue,
} from './definitions';
export { FRONTEND_STATE_SOURCE } from './definitions';

const registry = createFrontendStateRegistry(() => ({
  time: readBrowserTimeContext(),
  locale: readCurrentLanguage(),
}));

registerStore({ id: 'frontend-state', scope: 'tab', reset: registry.reset });

export const setFrontendStates = registry.setFrontendStates;
export const clearFrontendStates = registry.clearFrontendStates;
export const readFrontendStates = registry.readFrontendStates;

export function useFrontendStateValue<Key extends FrontendStateKey>(
  key: Key
): FrontendStateValues[Key] | undefined {
  return useSyncExternalStore(registry.subscribe, () => registry.getFrontendStateValue(key));
}
