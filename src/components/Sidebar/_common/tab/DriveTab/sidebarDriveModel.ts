import type {
  DriveActionTarget,
  DriveViewNode,
} from '@/components/Drive/common/driveComponentModel';
import { isDriveTrashFolderNode } from '@/components/Drive/common/driveComponentModel';
import type { DriveNode, FolderNode } from '@/domains/Drive';

export const SIDEBAR_RENDERABLE_TYPES = new Set<'root' | 'folder' | 'resource' | 'link'>([
  'root',
  'folder',
  'resource',
  'link',
]);
export const SIDEBAR_SELECTABLE_TYPES = new Set<'root' | 'folder' | 'resource' | 'link'>([
  'resource',
  'link',
]);
export const SIDEBAR_DISABLED_NODE_IDS = new Set<string>();

export function isSidebarResourceNode(
  node: DriveViewNode | undefined
): node is Extract<DriveNode, { type: 'resource' | 'link' }> {
  return node?.type === 'resource' || node?.type === 'link';
}

export function isSidebarNodeInTrash(
  node: DriveActionTarget | null,
  nodeMap: Map<string, DriveViewNode>
): boolean {
  let parentId = node?.parentId;
  while (parentId) {
    const parent = nodeMap.get(parentId);
    if (isDriveTrashFolderNode(parent)) return true;
    parentId = parent?.parentId ?? null;
  }
  return false;
}

export function getSidebarExistingFolderNames(
  nodeMap: Map<string, DriveViewNode>,
  parentId: string
): string[] {
  return [...nodeMap.values()]
    .filter((node): node is FolderNode => node.type === 'folder')
    .filter((node) => node.parentId === parentId)
    .map((node) => node.name);
}
