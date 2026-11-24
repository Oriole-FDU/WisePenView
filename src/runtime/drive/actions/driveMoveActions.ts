import {
  type AddResourcesToGroupParams,
  assertSingleDriveResourceMount,
  assertValidDriveMoveTarget,
  getDriveFolderTagIds,
  getDriveResourceIds,
  getDriveTargetTagId,
  type MoveNodesParams,
  normalizeDriveIds,
  prepareDriveActionNodes,
  sameDriveScope,
  type SetPersonalResourcesLocationParams,
} from '@/domains/Drive';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { DriveActionContext } from './driveActionContext';
import { completeDriveBatch, requireDriveScope } from './driveActionRules';
import type { DriveActions } from './index.type';

export const createDriveMoveActions = (
  context: DriveActionContext
): Pick<DriveActions, 'moveNodes' | 'setPersonalResourcesLocation' | 'addResourcesToGroup'> => {
  const { getGroupId, getTagAncestors, services } = context;
  const { resourceService, tagService } = services;

  const moveNodes = async ({ nodes, target }: MoveNodesParams) => {
    const {
      nodes: normalizedNodes,
      scope,
      resources,
      folders,
    } = prepareDriveActionNodes(nodes, getTagAncestors);
    if (!sameDriveScope(scope, target.scope)) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    const groupId = getGroupId(scope);
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
      const ids = getDriveFolderTagIds(movingFolders);
      await tagService.moveTags({ groupId, targetTagIds: ids, newParentId: targetTagId });
      affectedCount += ids.length;
    }

    return completeDriveBatch(context, scope, normalizedNodes.length, affectedCount);
  };

  const setPersonalResourcesLocation = async ({
    resourceIds,
    target,
  }: SetPersonalResourcesLocationParams) => {
    const ids = normalizeDriveIds(resourceIds);
    const personalScope = requireDriveScope(
      target.scope,
      'personal',
      FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE
    );
    const targetTagId = getDriveTargetTagId(target);
    let affectedCount = 0;
    if (ids.length > 0) {
      affectedCount = await resourceService.setPersonalResourcesPathTag({
        resourceIds: ids,
        targetPathTagId: targetTagId,
      });
    }
    return completeDriveBatch(context, personalScope, ids.length, affectedCount);
  };

  const addResourcesToGroup = async ({ resourceIds, target }: AddResourcesToGroupParams) => {
    const groupScope = requireDriveScope(
      target.scope,
      'group',
      FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE
    );
    const ids = normalizeDriveIds(resourceIds);
    let affectedCount = 0;
    if (ids.length > 0) {
      affectedCount = await resourceService.mountResourcesToGroup({
        resourceIds: ids,
        groupId: groupScope.groupId,
        targetTagId: target.tagId,
      });
    }
    return completeDriveBatch(context, groupScope, ids.length, affectedCount);
  };

  return { moveNodes, setPersonalResourcesLocation, addResourcesToGroup };
};
