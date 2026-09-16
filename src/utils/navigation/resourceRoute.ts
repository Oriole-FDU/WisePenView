import { buildDriveNodeScope, type DriveResourceLocation } from '@/domains/Drive';

import { APP_ROUTE_PATH } from './appRoute';

const RESOURCE_SCOPE_QUERY_KEY = 'scope';
const RESOURCE_GROUP_ID_QUERY_KEY = 'groupId';
const RESOURCE_TAG_ID_QUERY_KEY = 'tagId';

const appendSearch = (path: string, search: URLSearchParams): string => {
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

const appendResourceDriveLocation = (
  search: URLSearchParams,
  location: DriveResourceLocation
): void => {
  search.set(RESOURCE_SCOPE_QUERY_KEY, location.scope.type);
  search.set(RESOURCE_TAG_ID_QUERY_KEY, location.mountTagId);
  if (location.scope.type === 'group') {
    search.set(RESOURCE_GROUP_ID_QUERY_KEY, location.scope.groupId);
  }
};

export const parseResourceDriveLocation = (
  search: URLSearchParams
): DriveResourceLocation | undefined => {
  const scopeType = search.get(RESOURCE_SCOPE_QUERY_KEY);
  const mountTagId = search.get(RESOURCE_TAG_ID_QUERY_KEY)?.trim();
  if (!mountTagId) return undefined;
  if (scopeType === 'personal') {
    return { scope: buildDriveNodeScope(), mountTagId };
  }
  if (scopeType === 'group') {
    const groupId = search.get(RESOURCE_GROUP_ID_QUERY_KEY)?.trim();
    if (groupId) return { scope: buildDriveNodeScope(groupId), mountTagId };
  }
  return undefined;
};

export interface BuildResourcePathParams {
  resourceType: string;
  resourceId: string;
  viewer?: string;
  driveLocation?: DriveResourceLocation;
}

export const buildResourcePath = ({
  resourceType,
  resourceId,
  viewer,
  driveLocation,
}: BuildResourcePathParams): string => {
  const basePath = `${APP_ROUTE_PATH.RESOURCES}/${encodeURIComponent(resourceType.trim())}/${encodeURIComponent(resourceId.trim())}`;
  const search = new URLSearchParams();
  if (viewer?.trim()) search.set('viewer', viewer.trim());
  if (driveLocation) appendResourceDriveLocation(search, driveLocation);
  return appendSearch(basePath, search);
};

export const buildResourcePathWithSearch = (
  target: BuildResourcePathParams,
  currentSearch?: string
): string => {
  const pathname = buildResourcePath({
    resourceType: target.resourceType,
    resourceId: target.resourceId,
  });
  const search = new URLSearchParams();
  const viewer = target.viewer?.trim();
  if (viewer) search.set('viewer', viewer);
  const driveLocation =
    target.driveLocation ?? parseResourceDriveLocation(new URLSearchParams(currentSearch));
  if (driveLocation) appendResourceDriveLocation(search, driveLocation);

  const isPdf = target.resourceType.trim().toLowerCase() === 'pdf' || viewer === 'pdfPreview';
  if (isPdf) {
    const previousSearch = new URLSearchParams(currentSearch);
    const page = previousSearch.get('page');
    const zoom = previousSearch.get('zoom');
    if (page) search.set('page', page);
    if (zoom) search.set('zoom', zoom);
  }

  return appendSearch(pathname, search);
};
