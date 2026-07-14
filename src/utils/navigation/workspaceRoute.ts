import type { ResourceKind, ResourceViewer } from './resourceTarget';

const APP_WORKSPACE_ROUTE_PREFIX = '/app/workspace';

export interface WorkspaceOpenTarget {
  resourceId?: string;
  resourceType: ResourceKind;
  viewer?: ResourceViewer;
}

export const buildWorkspaceResourcePath = ({
  resourceType,
  resourceId,
  viewer,
}: WorkspaceOpenTarget): string => {
  const basePath = resourceId
    ? `${APP_WORKSPACE_ROUTE_PREFIX}/${resourceType}/${encodeURIComponent(resourceId)}`
    : `${APP_WORKSPACE_ROUTE_PREFIX}/${resourceType}`;
  if (!viewer) return basePath;

  const search = new URLSearchParams();
  search.set('viewer', viewer);
  return `${basePath}?${search.toString()}`;
};

export const buildWorkspaceResourcePathWithSearch = (
  target: WorkspaceOpenTarget,
  currentSearch?: string
): string => {
  const basePath = buildWorkspaceResourcePath(target);
  const [pathname, targetSearch = ''] = basePath.split('?');
  const search = new URLSearchParams(currentSearch);
  const targetParams = new URLSearchParams(targetSearch);

  search.delete('viewer');
  targetParams.forEach((value, key) => {
    search.set(key, value);
  });

  const nextSearch = search.toString();
  return nextSearch ? `${pathname}?${nextSearch}` : pathname;
};
