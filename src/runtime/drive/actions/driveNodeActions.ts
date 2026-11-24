import {
  type CreateFolderParams,
  mapTagToFolderNode,
  type RenameNodeParams,
} from '@/domains/Drive';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { DriveActionContext } from './driveActionContext';
import type { DriveActions } from './index.type';

export const createDriveNodeActions = (
  context: DriveActionContext
): Pick<DriveActions, 'createFolder' | 'renameNode'> => {
  const { getGroupId, getTagAncestors, notify, services } = context;
  const { resourceService, tagService } = services;

  const createFolder = async ({ parent, name }: CreateFolderParams) => {
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

  const renameNode = async ({ node, newName }: RenameNodeParams) => {
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

  return { createFolder, renameNode };
};
