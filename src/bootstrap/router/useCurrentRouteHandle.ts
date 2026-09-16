import { useMatches } from 'react-router-dom';

import type { AppRouteHandle } from './routeHandle';

export function useCurrentRouteHandle(): AppRouteHandle | undefined {
  const matches = useMatches();
  return matches.at(-1)?.handle as AppRouteHandle | undefined;
}
