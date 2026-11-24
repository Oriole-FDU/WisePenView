import {
  type AddResourcesToGroupParams,
  assertDriveActionScope,
  assertNoSystemDriveFolder,
  assertSingleDriveResourceMount,
  assertValidDriveMoveTarget,
  type FolderNode,
  getDriveResourceIds,
  getDriveTargetTagId,
  isDriveResourceNode,
  type MoveNodesParams,
  normalizeDriveActionNodes,
  normalizeDriveIds,
  sameDriveScope,
  type SetPersonalResourcesLocationParams,
} from '@/domains/Drive';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { DriveActionContext } from './driveActionContext';
import type { DriveActions } from './index.type';

export const createDriveMoveActions = (
  context: DriveActionContext
): Pick<DriveActions, 'moveNodes' | 'setPersonalResourcesLocation' | 'addResourcesToGroup'> => {
  const { getGroupId, getTagAncestors, notify, services } = context;
  const { resourceService, tagService } = services;

  const normalizeNodes = (nodes: MoveNodesParams['nodes']) =>
    normalizeDriveActionNodes(nodes, getTagAncestors);

  const moveNodes = async ({ nodes, target }: MoveNodesParams) => {
    const normalizedNodes = normalizeNodes(nodes);
    assertNoSystemDriveFolder(normalizedNodes);
    const scope = assertDriveActionScope(normalizedNodes);
    if (!sameDriveScope(scope, target.scope)) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    const groupId = getGroupId(scope);
    const resources = normalizedNodes.filter(isDriveResourceNode);
    const folders = normalizedNodes.filter((node): node is FolderNode => node.type === 'folder');
    assertValidDriveMoveTarget(folders, target);
    if (groupId) assertSingleDriveResourceMount(resources);
    const movingResources = resources.filter((node) => node.mountTagId !== target.tagId);
    const movingFolders = folders.filter((folder) => folder.parentId !== target.id);
    const resourceTargetTagId =
      movingResources.length > 0 ? getDriveTargetTagId(target) : undefined;
    const targetTagId = target.tagId;
    let affectedCount = 0;

    if (movingResources.length > 0 && resourceTargetTagId) {
      if (groupId) {
        affectedCount += await resourceService.moveResourcesInGroup({
          groupId,
          resourceSourceTagMap: Object.fromEntries(
            movingResources.map((node) => [node.resourceId, node.mountTagId])
          ),
          targetTagId: resourceTargetTagId,
        });
      } else {
        affectedCount += await resourceService.setPersonalResourcesPathTag({
          resourceIds: getDriveResourceIds(movingResources),
          targetPathTagId: resourceTargetTagId,
        });
      }
    }
    if (movingFolders.length > 0) {
      const ids = normalizeDriveIds(movingFolders.map((folder) => folder.tagId));
      await tagService.moveTags({ groupId, targetTagIds: ids, newParentId: targetTagId });
      affectedCount += ids.length;
    }

    notify(scope);
    return { requestedCount: normalizedNodes.length, affectedCount };
  };

  const setPersonalResourcesLocation = async ({
    resourceIds,
    target,
  }: SetPersonalResourcesLocationParams) => {
    const ids = normalizeDriveIds(resourceIds);
    if (target.scope.type !== 'personal') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    const targetTagId = getDriveTargetTagId(target);
    let affectedCount = 0;
    if (ids.length > 0) {
      affectedCount = await resourceService.setPersonalResourcesPathTag({
        resourceIds: ids,
        targetPathTagId: targetTagId,
      });
    }
    notify(target.scope);
    return { requestedCount: ids.length, affectedCount };
  };

  const addResourcesToGroup = async ({ resourceIds, target }: AddResourcesToGroupParams) => {
    if (target.scope.type !== 'group') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    const ids = normalizeDriveIds(resourceIds);
    let affectedCount = 0;
    if (ids.length > 0) {
      affectedCount = await resourceService.mountResourcesToGroup({
        resourceIds: ids,
        groupId: target.scope.groupId,
        targetTagId: target.tagId,
      });
    }
    notify(target.scope);
    return { requestedCount: ids.length, affectedCount };
  };

  return { moveNodes, setPersonalResourcesLocation, addResourcesToGroup };
};
