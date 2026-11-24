import {
  buildDriveResourceUnmountRounds,
  type DeleteTrashedNodesParams,
  getDriveFolderTagIds,
  getDriveResourceIds,
  isDriveNodeInsideFolder,
  type MoveNodesToTrashParams,
  prepareDriveActionNodes,
  type RemoveNodesFromGroupParams,
} from '@/domains/Drive';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { DriveActionContext } from './driveActionContext';
import { completeDriveBatch, requireDriveScope } from './driveActionRules';
import type { DriveActions } from './index.type';

export const createDriveDeleteActions = (
  context: DriveActionContext
): Pick<DriveActions, 'moveNodesToTrash' | 'removeNodesFromGroup' | 'deleteTrashedNodes'> => {
  const { getTagAncestors, services } = context;
  const { driveService, resourceService, tagService } = services;

  const moveNodesToTrash = async ({ nodes }: MoveNodesToTrashParams) => {
    const {
      nodes: normalizedNodes,
      scope,
      resources,
      folders,
    } = prepareDriveActionNodes(nodes, getTagAncestors);
    const personalScope = requireDriveScope(
      scope,
      'personal',
      FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE
    );
    let affectedCount = 0;
    if (resources.length > 0) {
      affectedCount += await resourceService.movePersonalResourcesToTrash({
        resourceIds: getDriveResourceIds(resources),
      });
    }
    if (folders.length > 0) {
      const trash = await driveService.getSystemFolder({ scope: personalScope, type: 'trash' });
      const ids = getDriveFolderTagIds(folders);
      await tagService.moveTags({ targetTagIds: ids, newParentId: trash.tagId });
      affectedCount += ids.length;
    }
    return completeDriveBatch(context, personalScope, normalizedNodes.length, affectedCount);
  };

  const removeNodesFromGroup = async ({ nodes }: RemoveNodesFromGroupParams) => {
    const {
      nodes: normalizedNodes,
      scope,
      resources,
      folders,
    } = prepareDriveActionNodes(nodes, getTagAncestors);
    const groupScope = requireDriveScope(
      scope,
      'group',
      FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE
    );
    const groupId = groupScope.groupId;
    let affectedCount = 0;

    for (const resourceSourceTagMap of buildDriveResourceUnmountRounds(resources)) {
      affectedCount += await resourceService.unmountResourcesToGroup({
        groupId,
        resourceSourceTagMap,
      });
    }
    if (folders.length > 0) {
      const ids = getDriveFolderTagIds(folders);
      await tagService.removeTags({ groupId, targetTagIds: ids });
      affectedCount += ids.length;
    }
    return completeDriveBatch(context, groupScope, normalizedNodes.length, affectedCount);
  };

  const deleteTrashedNodes = async ({ nodes }: DeleteTrashedNodesParams) => {
    const {
      nodes: normalizedNodes,
      scope,
      resources,
      folders,
    } = prepareDriveActionNodes(nodes, getTagAncestors);
    const personalScope = requireDriveScope(
      scope,
      'personal',
      FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE
    );
    const trash = await driveService.getSystemFolder({ scope: personalScope, type: 'trash' });
    if (normalizedNodes.some((node) => !isDriveNodeInsideFolder(node, trash, getTagAncestors))) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE);
    }
    const deletableFolders = folders.filter((folder) => folder.id !== trash.id);
    let affectedCount = 0;
    const resourceIds = getDriveResourceIds(resources);
    if (resourceIds.length > 0) {
      await resourceService.removeResources({ resourceIds });
      affectedCount += resourceIds.length;
    }
    if (deletableFolders.length > 0) {
      const tagIds = getDriveFolderTagIds(deletableFolders);
      await tagService.removeTags({ targetTagIds: tagIds });
      affectedCount += tagIds.length;
    }
    return completeDriveBatch(context, personalScope, normalizedNodes.length, affectedCount);
  };

  return { moveNodesToTrash, removeNodesFromGroup, deleteTrashedNodes };
};
