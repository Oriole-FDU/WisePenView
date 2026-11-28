import type { ReactNode } from 'react';

import type {
  OpenResourceFn,
  ResourceHostDriveNavigationTarget,
  ResourceHostRouteContext,
  ResourceHostViewerNavigationTarget,
} from '../_context/host';

export interface ResourceHostProps {
  children: ReactNode;
  routeContext: ResourceHostRouteContext;
  openResource: OpenResourceFn;
  navigateToDrive: (target: ResourceHostDriveNavigationTarget) => void;
  switchResourceViewer: (target: ResourceHostViewerNavigationTarget) => void;
  navigateResourceHash?: (hash: string) => void;
}
