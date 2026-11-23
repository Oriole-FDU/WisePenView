import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type {
  DriveContainerNode,
  DriveMutableNode,
  DriveNodeScope,
  DriveResourceNode,
  FolderNode,
} from '../entity/drive';

export type GetDriveTagAncestors = (tagId: string, groupId?: string) => string[];

export const normalizeDriveIds = (ids: string[]): string[] =>
  Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));

export const isDriveResourceNode = (node: DriveMutableNode): node is DriveResourceNode =>
  node.type === 'resource' || node.type === 'link';

export const sameDriveScope = (left: DriveNodeScope, right: DriveNodeScope): boolean =>
  left.rootId === right.rootId;

export const assertDriveActionScope = (nodes: DriveMutableNode[]): DriveNodeScope => {
  if (nodes.length === 0) {
    throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'nodes' });
  }
  const [first] = nodes;
  if (nodes.some((node) => !sameDriveScope(node.scope, first.scope))) {
    throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
  }
  return first.scope;
};

export const assertNoSystemDriveFolder = (nodes: DriveMutableNode[]): void => {
  if (nodes.some((node) => node.type === 'folder' && node.systemType)) {
    throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_SELECTION_CONTAINS_SYSTEM_FOLDER);
  }
};

export const isDriveNodeInsideFolder = (
  node: DriveMutableNode,
  folder: FolderNode,
  getTagAncestors: GetDriveTagAncestors
): boolean => {
  if (node.id === folder.id) return false;
  if (node.type === 'folder') return node.ancestorTagIds.includes(folder.tagId);
  if (node.mountTagId === folder.tagId) return true;
  const groupId = folder.scope.type === 'group' ? folder.scope.groupId : undefined;
  return getTagAncestors(node.mountTagId, groupId).includes(folder.tagId);
};

export const normalizeDriveActionNodes = (
  nodes: DriveMutableNode[],
  getTagAncestors: GetDriveTagAncestors
): DriveMutableNode[] => {
  const byNodeId = new Map(nodes.map((node) => [node.id, node]));
  const uniqueNodes = [...byNodeId.values()];
  const folders = uniqueNodes.filter((node): node is FolderNode => node.type === 'folder');
  return uniqueNodes.filter(
    (node) => !folders.some((folder) => isDriveNodeInsideFolder(node, folder, getTagAncestors))
  );
};

export const groupDriveResourcesById = (
  nodes: DriveResourceNode[]
): Map<string, DriveResourceNode[]> => {
  const groups = new Map<string, DriveResourceNode[]>();
  nodes.forEach((node) => {
    const group = groups.get(node.resourceId) ?? [];
    group.push(node);
    groups.set(node.resourceId, group);
  });
  return groups;
};

export const assertSingleDriveResourceMount = (nodes: DriveResourceNode[]): void => {
  const containsMultipleMounts = [...groupDriveResourcesById(nodes).values()].some(
    (group) => new Set(group.map((node) => node.mountTagId)).size > 1
  );
  if (containsMultipleMounts) {
    throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_MULTIPLE_MOUNTS_MOVE_UNSUPPORTED);
  }
};

export const buildDriveResourceUnmountRounds = (
  nodes: DriveResourceNode[]
): Array<Record<string, string>> => {
  const remainingByResourceId = new Map<string, DriveResourceNode[]>();
  groupDriveResourcesById(nodes).forEach((group, resourceId) => {
    const primaryMount = group.find((node) => node.type === 'resource');
    if (primaryMount) {
      remainingByResourceId.set(resourceId, [primaryMount]);
      return;
    }
    const uniqueMounts = new Map(group.map((node) => [node.mountTagId, node]));
    remainingByResourceId.set(resourceId, [...uniqueMounts.values()]);
  });

  const rounds: Array<Record<string, string>> = [];
  while ([...remainingByResourceId.values()].some((group) => group.length > 0)) {
    const round: Record<string, string> = {};
    remainingByResourceId.forEach((group, resourceId) => {
      const node = group.shift();
      if (node) round[resourceId] = node.mountTagId;
    });
    rounds.push(round);
  }
  return rounds;
};

export const getDriveTargetTagId = (target: DriveContainerNode): string => {
  const tagId = target.tagId;
  if (!tagId) {
    throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_TARGET_TAG_ID_MISSING);
  }
  if (target.type === 'folder' && target.systemType) {
    throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
  }
  return tagId;
};

export const assertValidDriveMoveTarget = (
  folders: FolderNode[],
  target: DriveContainerNode
): void => {
  if (target.type === 'folder' && target.systemType) {
    throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
  }
  if (
    target.type === 'folder' &&
    folders.some(
      (folder) => folder.id === target.id || target.ancestorTagIds.includes(folder.tagId)
    )
  ) {
    throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
  }
};

export const getDriveResourceIds = (nodes: DriveResourceNode[]): string[] =>
  normalizeDriveIds(nodes.map((node) => node.resourceId));
