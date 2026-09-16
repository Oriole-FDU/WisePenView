import { resolveResourceIconType, type ResourceItem } from '@/domains/Resource';
import type { TagTreeNode } from '@/domains/Tag';
import { normalizeTagGroupId } from '@/utils/normalize/normalizeTagGroupId';

import type {
  DriveNodeScope,
  DriveSystemFolderType,
  FolderNode,
  LinkNode,
  ResourceNode,
  RootNode,
} from '../entity/drive';

export const DRIVE_ROOT_ID = 'drive-root';
export const DRIVE_SHARED_TAG_NAME = '.Shared';
export const DRIVE_TRASH_TAG_NAME = '.Trash';
const DRIVE_GROUP_ROOT_PREFIX = 'drive-root:group:';

type EncodedNodeKind = 'folder' | 'resource' | 'link';

type DecodedNodeId =
  | { kind: 'root'; groupId?: string }
  | { kind: 'folder'; tagId: string }
  | { kind: 'resource'; resourceId: string; parentTagId: string }
  | { kind: 'link'; resourceId: string; parentTagId: string }
  | { kind: 'unknown'; raw: string };

const getFolderName = (tagName: string): string => {
  if (tagName === '/' || tagName === DRIVE_SHARED_TAG_NAME || tagName === DRIVE_TRASH_TAG_NAME) {
    return '';
  }
  if (tagName.startsWith('/')) return tagName.slice(1);
  return tagName;
};

const resolveSystemFolderType = (tagName: string): DriveSystemFolderType | undefined => {
  if (tagName === DRIVE_TRASH_TAG_NAME) return 'trash';
  if (tagName === DRIVE_SHARED_TAG_NAME) return 'shared';
  return undefined;
};

const encodeNodeId = (kind: EncodedNodeKind, ...parts: string[]): string => {
  return [kind, ...parts].join(':');
};

const encodeRootNodeId = (groupId?: string): string => {
  const normalizedGroupId = normalizeTagGroupId(groupId);
  return normalizedGroupId ? `${DRIVE_GROUP_ROOT_PREFIX}${normalizedGroupId}` : DRIVE_ROOT_ID;
};

export const buildDriveNodeScope = (groupId?: string): DriveNodeScope => {
  const normalizedGroupId = normalizeTagGroupId(groupId);
  const rootId = encodeRootNodeId(normalizedGroupId);
  if (normalizedGroupId) {
    return {
      type: 'group',
      rootId,
      groupId: normalizedGroupId,
    };
  }
  return {
    type: 'personal',
    rootId,
  };
};

export const decodeNodeId = (id: string): DecodedNodeId => {
  if (id === DRIVE_ROOT_ID) return { kind: 'root' };
  if (id.startsWith(DRIVE_GROUP_ROOT_PREFIX)) {
    const groupId = id.slice(DRIVE_GROUP_ROOT_PREFIX.length);
    if (groupId) return { kind: 'root', groupId };
  }
  const [kind, ...parts] = id.split(':');
  if (kind === 'folder' && parts[0]) return { kind: 'folder', tagId: parts[0] };
  if (kind === 'resource' && parts[0] && parts[1]) {
    return { kind: 'resource', resourceId: parts[0], parentTagId: parts[1] };
  }
  if (kind === 'link' && parts[0] && parts[1]) {
    return { kind: 'link', resourceId: parts[0], parentTagId: parts[1] };
  }
  return { kind: 'unknown', raw: id };
};

export const decodeRootNodeScope = (rootId?: string, fallbackGroupId?: string): DriveNodeScope => {
  if (!rootId) return buildDriveNodeScope(fallbackGroupId);
  const decoded = decodeNodeId(rootId);
  const groupId = decoded.kind === 'root' ? (decoded.groupId ?? fallbackGroupId) : fallbackGroupId;
  return buildDriveNodeScope(groupId);
};

export const mapTagToFolderNode = (
  tag: TagTreeNode,
  parentNodeId: string | null,
  scope: DriveNodeScope,
  ancestorTagIds: string[] = []
): FolderNode => {
  return {
    id: encodeNodeId('folder', tag.tagId),
    type: 'folder',
    parentId: parentNodeId,
    scope,
    tagId: tag.tagId,
    name: getFolderName(tag.tagName),
    tagCreator: tag.tagCreator,
    creatorInfo: tag.creatorInfo,
    systemType: resolveSystemFolderType(tag.tagName),
    description: tag.tagDesc,
    taggedResourceAclGrantScope: tag.taggedResourceAclGrantScope,
    tagMountPermissionScope: tag.tagMountPermissionScope,
    grantedActions: tag.grantedActions,
    ancestorTagIds,
  };
};

export const orderDriveFolderNodes = (nodes: FolderNode[]): FolderNode[] => {
  const sharedNodes: FolderNode[] = [];
  const remainingNodes: FolderNode[] = [];

  nodes.forEach((node) => {
    if (node.systemType === 'shared') {
      sharedNodes.push(node);
      return;
    }
    remainingNodes.push(node);
  });

  return [...sharedNodes, ...remainingNodes];
};

export const mapResourceItemToChildNode = (
  item: ResourceItem,
  parentTagId: string,
  parentNodeId: string,
  scope: DriveNodeScope,
  primaryTagId = item.mainTagId
): ResourceNode | LinkNode => {
  const common = {
    parentId: parentNodeId,
    scope,
    resourceId: item.resourceId,
    title: item.resourceName,
    resourceType: item.resourceType,
    size: item.size,
    description: item.preview,
    ownerId: item.ownerId,
    ownerInfo: item.ownerInfo,
    currentActions: item.currentActions,
    resourceAccessRole: item.resourceAccessRole,
    resourceIconType: item.resourceIconType ?? resolveResourceIconType(item.resourceType),
    mountTagId: parentTagId,
  } as const;
  if (scope.type === 'personal' || primaryTagId == null || primaryTagId === parentTagId) {
    return {
      id: encodeNodeId('resource', item.resourceId, parentTagId),
      type: 'resource',
      ...common,
    };
  }
  return {
    id: encodeNodeId('link', item.resourceId, parentTagId),
    type: 'link',
    primaryTagId,
    ...common,
    scope,
  };
};

export const buildDriveRootNode = (params: {
  groupId?: string;
  personalRootTag?: TagTreeNode;
}): RootNode => {
  const isGroupRoot = Boolean(params.groupId);
  const scope = buildDriveNodeScope(params.groupId);
  return {
    id: scope.rootId,
    type: 'root',
    parentId: null,
    scope,
    tagId: params.personalRootTag?.tagId,
    canMountResources: !isGroupRoot && Boolean(params.personalRootTag?.tagId),
    name: '',
  };
};
