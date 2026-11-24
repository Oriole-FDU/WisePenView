import { getServices, type ServicesContextValue } from '@/domains';
import type { DriveNodeScope } from '@/domains/Drive';

export interface DriveActionContext {
  services: ServicesContextValue;
  getGroupId(scope: DriveNodeScope): string | undefined;
  getTagAncestors(tagId: string, groupId?: string): string[];
  notify(scope: DriveNodeScope): void;
}

const getGroupId = (scope: DriveNodeScope): string | undefined =>
  scope.type === 'group' ? scope.groupId : undefined;

export const createDriveActionContext = (
  notifyScopeChanged: (scope: DriveNodeScope) => void
): DriveActionContext => {
  const services = getServices();

  const getTagAncestors = (tagId: string, groupId?: string): string[] => {
    const ancestors: string[] = [];
    let current = services.tagService.getRawTagById(tagId, groupId);
    while (current?.parentId) {
      ancestors.unshift(current.parentId);
      current = services.tagService.getRawTagById(current.parentId, groupId);
    }
    return ancestors;
  };

  return {
    services,
    getGroupId,
    getTagAncestors,
    notify: notifyScopeChanged,
  };
};
