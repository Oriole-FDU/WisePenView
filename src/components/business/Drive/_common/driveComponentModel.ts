import {
  decodeNodeId,
  decodeRootNodeScope,
  DRIVE_ROOT_ID,
  type DriveNode,
  type DriveNodeScope,
  type DriveSystemFolderType,
  type FolderNode,
  resolveDriveSystemFolderType,
} from '@/domains/Drive';
import i18n from '@/i18n';

export const DEFAULT_DRIVE_ROOT_ID = DRIVE_ROOT_ID;

export type DriveScope = { type: 'personal' } | { type: 'group'; groupId: string };

export type DriveItemKind = 'root' | 'folder' | 'resource' | 'link';

/** 组件分页占位节点，不进入 Drive 领域 Service。 */
export interface DriveLoadingNode {
  id: string;
  type: 'loading';
  parentId: string;
  scope: DriveNodeScope;
  label?: string;
}

export type DriveViewNode = DriveNode | DriveLoadingNode;

export type DriveActionTarget = Extract<DriveNode, { type: 'folder' | 'resource' | 'link' }>;

export type DriveFolderVariant = Exclude<DriveSystemFolderType, 'trash'> | undefined;

const DRIVE_SYSTEM_FOLDER_LABEL_KEYS = {
  trash: 'node.trash',
  shared: 'node.shared',
  note: 'node.note',
  page: 'node.page',
} as const satisfies Record<DriveSystemFolderType, string>;

export interface DriveSelectionItem {
  nodeId: string;
  kind: DriveItemKind;
  label: string;
  parentNodeId: string | null;
  scope: DriveNodeScope;
  rootId: string;
  groupId?: string;
  scopeLabel?: string;
  resourceId?: string;
  resourceType?: string;
  tagId?: string;
}

export const getDriveScopeGroupId = (scope: DriveNodeScope): string | undefined =>
  scope.type === 'group' ? scope.groupId : undefined;

export const resolveDriveScope = (
  scope?: DriveScope,
  fallbackGroupId?: string,
  rootId?: string
) => {
  const fallbackScopeGroupId =
    scope == null ? fallbackGroupId : scope.type === 'group' ? scope.groupId : undefined;
  const nodeScope = decodeRootNodeScope(rootId, fallbackScopeGroupId);
  return {
    scope: nodeScope,
    rootId: nodeScope.rootId,
    groupId: getDriveScopeGroupId(nodeScope),
  };
};

export const buildDriveLoadingNode = (
  parentNodeId: string,
  scope: DriveNodeScope,
  label?: string
): DriveLoadingNode => ({
  id: `loading:${parentNodeId}`,
  type: 'loading',
  parentId: parentNodeId,
  scope,
  label,
});

export const getDriveNodeLabel = (node: DriveViewNode): string => {
  switch (node.type) {
    case 'root':
      return node.name || i18n.t('node.drive', { ns: 'drive' });
    case 'folder': {
      const systemType = node.systemType ?? resolveDriveSystemFolderType(node.name);
      if (systemType) return i18n.t(DRIVE_SYSTEM_FOLDER_LABEL_KEYS[systemType], { ns: 'drive' });
      return node.name || i18n.t('node.unnamedFolder', { ns: 'drive' });
    }
    case 'resource':
    case 'link':
      return node.title || i18n.t('node.unnamedFile', { ns: 'drive' });
    case 'loading':
      return '';
  }
};

export const isDriveActionTarget = (node: DriveViewNode): node is DriveActionTarget =>
  node.type === 'folder' || node.type === 'resource' || node.type === 'link';

export const isDriveSystemFolderNode = (
  node: DriveViewNode | null | undefined
): node is FolderNode => node?.type === 'folder' && Boolean(node.systemType);

export const isDriveTrashFolderNode = (
  node: DriveViewNode | null | undefined
): node is FolderNode => {
  if (node?.type !== 'folder') return false;
  return (node.systemType ?? resolveDriveSystemFolderType(node.name)) === 'trash';
};

/** 系统目录只在名称与图标上有差异，操作限制统一由 systemType 控制。 */
export const resolveDriveFolderVariant = (
  node: DriveViewNode | null | undefined
): DriveFolderVariant => {
  if (node?.type !== 'folder' || !node.systemType || node.systemType === 'trash') return undefined;
  return node.systemType;
};

/** 从当前目录 nodeId 解析可挂载资源的 tagId */
export const resolveCurrentFolderTagId = (
  currentNodeId: string,
  pathNodes: DriveNode[]
): string | undefined => {
  const decoded = decodeNodeId(currentNodeId);
  if (decoded.kind === 'folder') {
    const currentNode = pathNodes.find(
      (node): node is FolderNode => node.type === 'folder' && node.tagId === decoded.tagId
    );
    if (currentNode?.systemType) return undefined;
    return decoded.tagId;
  }
  if (decoded.kind === 'root') {
    const root = pathNodes.find((node) => node.type === 'root');
    return root?.canMountResources ? root.tagId : undefined;
  }
  return undefined;
};

/** 从当前路径解析批量操作所需的容器节点。 */
export const resolveCurrentDriveContainer = (
  currentNodeId: string,
  pathNodes: DriveNode[]
): Extract<DriveNode, { type: 'root' | 'folder' }> | undefined =>
  pathNodes.find(
    (node): node is Extract<DriveNode, { type: 'root' | 'folder' }> =>
      node.id === currentNodeId && (node.type === 'root' || node.type === 'folder')
  );

export const toDriveSelectionItem = (node: DriveViewNode): DriveSelectionItem | null => {
  if (node.type === 'loading') return null;
  if (node.type === 'root') {
    return {
      nodeId: node.id,
      kind: node.type,
      label: getDriveNodeLabel(node),
      parentNodeId: node.parentId,
      scope: node.scope,
      rootId: node.scope.rootId,
      groupId: getDriveScopeGroupId(node.scope),
      tagId: node.tagId,
    };
  }
  if (node.type === 'folder') {
    return {
      nodeId: node.id,
      kind: node.type,
      label: getDriveNodeLabel(node),
      parentNodeId: node.parentId,
      scope: node.scope,
      rootId: node.scope.rootId,
      groupId: getDriveScopeGroupId(node.scope),
      tagId: node.tagId,
    };
  }
  return {
    nodeId: node.id,
    kind: node.type,
    label: getDriveNodeLabel(node),
    parentNodeId: node.parentId,
    scope: node.scope,
    rootId: node.scope.rootId,
    groupId: getDriveScopeGroupId(node.scope),
    resourceId: node.resourceId,
    resourceType: node.resourceType,
  };
};
