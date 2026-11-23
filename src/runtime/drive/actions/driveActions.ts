import { getServices } from '@/domains';
import {
  type AddResourcesToGroupParams,
  assertDriveActionScope,
  assertNoSystemDriveFolder,
  assertSingleDriveResourceMount,
  assertValidDriveMoveTarget,
  buildDriveResourceUnmountRounds,
  type CreateFolderParams,
  type DeleteTrashedNodesParams,
  type DriveBatchOperationResult,
  type DriveNodeScope,
  type FolderNode,
  getDriveResourceIds,
  getDriveTargetTagId,
  isDriveNodeInsideFolder,
  isDriveResourceNode,
  mapTagToFolderNode,
  type MoveNodesParams,
  type MoveNodesToTrashParams,
  normalizeDriveActionNodes,
  normalizeDriveIds,
  type RemoveNodesFromGroupParams,
  type RenameNodeParams,
  sameDriveScope,
  type SetPersonalResourcesLocationParams,
} from '@/domains/Drive';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

export interface DriveActions {
  createFolder(params: CreateFolderParams): Promise<FolderNode>;
  renameNode(params: RenameNodeParams): Promise<void>;
  setPersonalResourcesLocation(
    params: SetPersonalResourcesLocationParams
  ): Promise<DriveBatchOperationResult>;
  addResourcesToGroup(params: AddResourcesToGroupParams): Promise<DriveBatchOperationResult>;
  moveNodes(params: MoveNodesParams): Promise<DriveBatchOperationResult>;
  moveNodesToTrash(params: MoveNodesToTrashParams): Promise<DriveBatchOperationResult>;
  removeNodesFromGroup(params: RemoveNodesFromGroupParams): Promise<DriveBatchOperationResult>;
  deleteTrashedNodes(params: DeleteTrashedNodesParams): Promise<DriveBatchOperationResult>;
}

const getGroupId = (scope: DriveNodeScope): string | undefined =>
  scope.type === 'group' ? scope.groupId : undefined;

export const createDriveActions = (
  notifyScopeChanged: (scope: DriveNodeScope) => void
): DriveActions => {
  const { driveService, resourceService, tagService } = getServices();

  const getTagAncestors = (tagId: string, groupId?: string): string[] => {
    const ancestors: string[] = [];
    let current = tagService.getRawTagById(tagId, groupId);
    while (current?.parentId) {
      ancestors.unshift(current.parentId);
      current = tagService.getRawTagById(current.parentId, groupId);
    }
    return ancestors;
  };

  const notify = (scope: DriveNodeScope): void => {
    notifyScopeChanged(scope);
  };

  const createFolder: DriveActions['createFolder'] = async ({ parent, name }) => {
    const tagName = name.trim();
    if (!tagName) {
      throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'name' });
    }
    if (parent.type === 'folder' && parent.systemType) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    const groupId = getGroupId(parent.scope);
    const tagId = await tagService.addTag({
      groupId,
      parentId: parent.tagId ?? '0',
      tagName: parent.scope.type === 'personal' ? `/${tagName}` : tagName,
    });
    await tagService.getRawTagTree(groupId, { refresh: true });
    const tag = tagService.getRawTagById(tagId, groupId);
    if (!tag) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, { nodeId: tagId });
    }
    const folder = mapTagToFolderNode(
      tag,
      parent.id,
      parent.scope,
      getTagAncestors(tag.tagId, groupId)
    );
    notify(parent.scope);
    return folder;
  };

  const renameNode: DriveActions['renameNode'] = async ({ node, newName }) => {
    const name = newName.trim();
    if (!name) {
      throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'newName' });
    }
    const groupId = getGroupId(node.scope);
    if (node.type === 'folder') {
      if (node.systemType) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_RENAME);
      }
      await tagService.updateTag({
        groupId,
        targetTagId: node.tagId,
        tagName: node.scope.type === 'personal' ? `/${name}` : name,
      });
      notify(node.scope);
      return;
    }
    if (node.type === 'link') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_LINK_UNSUPPORTED_RENAME);
    }
    if (node.type === 'resource') {
      await resourceService.renameResource({ resourceId: node.resourceId, newName: name });
      notify(node.scope);
      return;
    }
    throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_RENAME);
  };

  const moveNodes: DriveActions['moveNodes'] = async ({ nodes, target }) => {
    const normalizedNodes = normalizeDriveActionNodes(nodes, getTagAncestors);
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
    return {
      requestedCount: normalizedNodes.length,
      affectedCount,
    };
  };

  const moveNodesToTrash: DriveActions['moveNodesToTrash'] = async ({ nodes }) => {
    const normalizedNodes = normalizeDriveActionNodes(nodes, getTagAncestors);
    assertNoSystemDriveFolder(normalizedNodes);
    const scope = assertDriveActionScope(normalizedNodes);
    if (scope.type !== 'personal') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE);
    }
    const resources = normalizedNodes.filter(isDriveResourceNode);
    const folders = normalizedNodes.filter((node): node is FolderNode => node.type === 'folder');
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

  const removeNodesFromGroup: DriveActions['removeNodesFromGroup'] = async ({ nodes }) => {
    const normalizedNodes = normalizeDriveActionNodes(nodes, getTagAncestors);
    assertNoSystemDriveFolder(normalizedNodes);
    const scope = assertDriveActionScope(normalizedNodes);
    if (scope.type !== 'group') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE);
    }
    const groupId = scope.groupId;
    const resources = normalizedNodes.filter(isDriveResourceNode);
    const folders = normalizedNodes.filter((node): node is FolderNode => node.type === 'folder');
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

  const deleteTrashedNodes: DriveActions['deleteTrashedNodes'] = async ({ nodes }) => {
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
    const resources = normalizedNodes.filter(isDriveResourceNode);
    const folders = normalizedNodes.filter(
      (node): node is FolderNode => node.type === 'folder' && node.id !== trash.id
    );
    let affectedCount = 0;
    const ids = getDriveResourceIds(resources);
    if (ids.length > 0) {
      await resourceService.removeResources({ resourceIds: ids });
      affectedCount += ids.length;
    }
    if (folders.length > 0) {
      const tagIds = normalizeDriveIds(folders.map((folder) => folder.tagId));
      await tagService.removeTags({ targetTagIds: tagIds });
      affectedCount += tagIds.length;
    }
    notify(scope);
    return { requestedCount: normalizedNodes.length, affectedCount };
  };

  const setPersonalResourcesLocation: DriveActions['setPersonalResourcesLocation'] = async ({
    resourceIds,
    target,
  }) => {
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

  const addResourcesToGroup: DriveActions['addResourcesToGroup'] = async ({
    resourceIds,
    target,
  }) => {
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

  return {
    createFolder,
    renameNode,
    setPersonalResourcesLocation,
    addResourcesToGroup,
    moveNodes,
    moveNodesToTrash,
    removeNodesFromGroup,
    deleteTrashedNodes,
  };
};
