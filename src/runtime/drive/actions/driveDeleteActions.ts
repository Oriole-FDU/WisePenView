import {
  assertDriveActionScope,
  assertNoSystemDriveFolder,
  buildDriveResourceUnmountRounds,
  type DeleteTrashedNodesParams,
  type FolderNode,
  getDriveResourceIds,
  isDriveNodeInsideFolder,
  isDriveResourceNode,
  type MoveNodesToTrashParams,
  normalizeDriveActionNodes,
  normalizeDriveIds,
  type RemoveNodesFromGroupParams,
} from '@/domains/Drive';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { DriveActionContext } from './driveActionContext';
import type { DriveActions } from './index.type';

export const createDriveDeleteActions = (
  context: DriveActionContext
): Pick<DriveActions, 'moveNodesToTrash' | 'removeNodesFromGroup' | 'deleteTrashedNodes'> => {
  const { getTagAncestors, notify, services } = context;
  const { driveService, resourceService, tagService } = services;

  const prepareNodes = (
    nodes: MoveNodesToTrashParams['nodes'] | RemoveNodesFromGroupParams['nodes']
  ) => {
    const normalizedNodes = normalizeDriveActionNodes(nodes, getTagAncestors);
    assertNoSystemDriveFolder(normalizedNodes);
    return normalizedNodes;
  };

  const splitNodes = (nodes: DeleteTrashedNodesParams['nodes']) => ({
    resources: nodes.filter(isDriveResourceNode),
    folders: nodes.filter((node): node is FolderNode => node.type === 'folder'),
  });

  const moveNodesToTrash = async ({ nodes }: MoveNodesToTrashParams) => {
    const normalizedNodes = prepareNodes(nodes);
    const scope = assertDriveActionScope(normalizedNodes);
    if (scope.type !== 'personal') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE);
    }
    const { resources, folders } = splitNodes(normalizedNodes);
    let affectedCount = 0;
    if (resources.length > 0) {
      affectedCount += await resourceService.movePersonalResourcesToTrash({
        resourceIds: getDriveResourceIds(resources),
      });
    }
    if (folders.length > 0) {
      const trash = await driveService.getSystemFolder({ scope, type: 'trash' });
      const ids = normalizeDriveIds(folders.map((folder) => folder.tagId));
      await tagService.moveTags({ targetTagIds: ids, newParentId: trash.tagId });
      affectedCount += ids.length;
    }
    notify(scope);
    return { requestedCount: normalizedNodes.length, affectedCount };
  };

  const removeNodesFromGroup = async ({ nodes }: RemoveNodesFromGroupParams) => {
    const normalizedNodes = prepareNodes(nodes);
    const scope = assertDriveActionScope(normalizedNodes);
    if (scope.type !== 'group') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE);
    }
    const groupId = scope.groupId;
    const { resources, folders } = splitNodes(normalizedNodes);
    let affectedCount = 0;

    for (const resourceSourceTagMap of buildDriveResourceUnmountRounds(resources)) {
      affectedCount += await resourceService.unmountResourcesToGroup({
        groupId,
        resourceSourceTagMap,
      });
    }
    if (folders.length > 0) {
      const ids = normalizeDriveIds(folders.map((folder) => folder.tagId));
      await tagService.removeTags({ groupId, targetTagIds: ids });
      affectedCount += ids.length;
    }
    notify(scope);
    return { requestedCount: normalizedNodes.length, affectedCount };
  };

  const deleteTrashedNodes = async ({ nodes }: DeleteTrashedNodesParams) => {
    const normalizedNodes = normalizeDriveActionNodes(nodes, getTagAncestors);
    assertNoSystemDriveFolder(normalizedNodes);
    const scope = assertDriveActionScope(normalizedNodes);
    if (scope.type !== 'personal') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE);
    }
    const trash = await driveService.getSystemFolder({ scope, type: 'trash' });
    if (normalizedNodes.some((node) => !isDriveNodeInsideFolder(node, trash, getTagAncestors))) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE);
    }
    const { resources, folders: trashedFolders } = splitNodes(normalizedNodes);
    const folders = trashedFolders.filter((folder) => folder.id !== trash.id);
    let affectedCount = 0;
    const resourceIds = getDriveResourceIds(resources);
    if (resourceIds.length > 0) {
      await resourceService.removeResources({ resourceIds });
      affectedCount += resourceIds.length;
    }
    if (folders.length > 0) {
      const tagIds = normalizeDriveIds(folders.map((folder) => folder.tagId));
      await tagService.removeTags({ targetTagIds: tagIds });
      affectedCount += tagIds.length;
    }
    notify(scope);
    return { requestedCount: normalizedNodes.length, affectedCount };
  };

  return { moveNodesToTrash, removeNodesFromGroup, deleteTrashedNodes };
};
