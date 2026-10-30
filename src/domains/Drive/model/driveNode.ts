import { resolveResourceIconType, type ResourceItem } from '@/domains/Resource';
import type { TagTreeNode } from '@/domains/Tag';
import { normalizeTagGroupId } from '@/domains/Tag/utils/normalizeTagGroupId';

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
export const DRIVE_NOTE_TAG_NAME = '.Note';
export const DRIVE_PAGE_TAG_NAME = '.Page';
export const DRIVE_TRASH_TAG_NAME = '.Trash';
const DRIVE_GROUP_ROOT_PREFIX = 'drive-root:group:';
const NON_SYSTEM_FOLDER_ORDER = Number.MAX_SAFE_INTEGER;

export interface DriveSystemFolderDefinition {
  tagName: string;
  visible: boolean;
  order: number;
}

export const DRIVE_SYSTEM_FOLDER_DEFINITIONS = {
  shared: { tagName: DRIVE_SHARED_TAG_NAME, visible: true, order: 0 },
  note: { tagName: DRIVE_NOTE_TAG_NAME, visible: true, order: 1 },
  page: { tagName: DRIVE_PAGE_TAG_NAME, visible: true, order: 2 },
  trash: { tagName: DRIVE_TRASH_TAG_NAME, visible: false, order: 3 },
} as const satisfies Record<DriveSystemFolderType, DriveSystemFolderDefinition>;

const DRIVE_SYSTEM_FOLDER_TYPES = Object.keys(
  DRIVE_SYSTEM_FOLDER_DEFINITIONS
) as DriveSystemFolderType[];

export const DRIVE_ROOT_SYSTEM_FOLDER_TYPES: readonly DriveSystemFolderType[] =
  DRIVE_SYSTEM_FOLDER_TYPES.filter((type) => DRIVE_SYSTEM_FOLDER_DEFINITIONS[type].visible).sort(
    (left, right) =>
      DRIVE_SYSTEM_FOLDER_DEFINITIONS[left].order - DRIVE_SYSTEM_FOLDER_DEFINITIONS[right].order
  );

export const getDriveSystemFolderDefinition = (type: DriveSystemFolderType) =>
  DRIVE_SYSTEM_FOLDER_DEFINITIONS[type];

export const resolveDriveSystemFolderType = (tagName: string): DriveSystemFolderType | undefined =>
  DRIVE_SYSTEM_FOLDER_TYPES.find(
    (type) => DRIVE_SYSTEM_FOLDER_DEFINITIONS[type].tagName === tagName
  );

type EncodedNodeKind = 'folder' | 'resource' | 'link';

type DecodedNodeId =
  | { kind: 'root'; groupId?: string }
  | { kind: 'folder'; tagId: string }
  | { kind: 'resource'; resourceId: string; parentTagId: string }
  | { kind: 'link'; resourceId: string; parentTagId: string }
  | { kind: 'unknown'; raw: string };

const getFolderName = (tagName: string): string => {
  if (tagName === '/' || resolveDriveSystemFolderType(tagName)) {
    return '';
  }
  if (tagName.startsWith('/')) return tagName.slice(1);
  return tagName;
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
    systemType: resolveDriveSystemFolderType(tag.tagName),
    description: tag.tagDesc,
    taggedResourceAclGrantScope: tag.taggedResourceAclGrantScope,
    tagMountPermissionScope: tag.tagMountPermissionScope,
    grantedActions: tag.grantedActions,
    ancestorTagIds,
  };
};

export const orderDriveFolderNodes = (nodes: FolderNode[]): FolderNode[] => {
  const getOrder = (node: FolderNode): number =>
    node.systemType
      ? DRIVE_SYSTEM_FOLDER_DEFINITIONS[node.systemType].order
      : NON_SYSTEM_FOLDER_ORDER;
  return [...nodes].sort((left, right) => getOrder(left) - getOrder(right));
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
