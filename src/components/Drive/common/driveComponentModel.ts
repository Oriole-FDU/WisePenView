import type { IDocumentService } from '@/domains/Document';
import {
  decodeRootNodeScope,
  DRIVE_ROOT_ID,
  type DriveNode,
  type DriveNodeScope,
  type FolderNode,
  type LoadingNode,
} from '@/domains/Drive';
import { decodeNodeId } from '@/domains/Drive/mapper/DriveServices.map';
import type { IResourceService, ResourceItem } from '@/domains/Resource';
import i18n from '@/i18n';

export const DEFAULT_DRIVE_ROOT_ID = DRIVE_ROOT_ID;

export type DriveScope = { type: 'personal' } | { type: 'group'; groupId: string };

export type DriveItemKind = 'root' | 'folder' | 'resource' | 'link';

export type DriveDataNode = Exclude<DriveNode, LoadingNode>;

export type DriveActionTarget = Extract<DriveNode, { type: 'folder' | 'resource' | 'link' }>;

export interface DriveSelectionItem {
  nodeId: string;
  kind: DriveItemKind;
  label: string;
  parentNodeId: string | null;
  scope: DriveNodeScope;
  rootId: string;
  groupId?: string;
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

export const getDriveNodeLabel = (node: DriveNode): string => {
  switch (node.type) {
    case 'root':
      return node.name || i18n.t('node.drive', { ns: 'drive' });
    case 'folder':
      if (node.name === '.Trash') {
        return i18n.t('node.trash', { ns: 'drive' });
      }
      if (node.systemType === 'shared') {
        return i18n.t('node.shared', { ns: 'drive' });
      }
      return node.name || i18n.t('node.unnamedFolder', { ns: 'drive' });
    case 'resource':
    case 'link':
      return node.title || i18n.t('node.unnamedFile', { ns: 'drive' });
    case 'loading':
      return '';
  }
};

export const isDriveActionTarget = (node: DriveNode): node is DriveActionTarget =>
  node.type === 'folder' || node.type === 'resource' || node.type === 'link';

export const isDriveSystemFolderNode = (node: DriveNode | null | undefined): node is FolderNode =>
  node?.type === 'folder' && Boolean(node.systemType);

export const isDriveSharedFolderNode = (node: DriveNode | null | undefined): node is FolderNode =>
  node?.type === 'folder' && node.systemType === 'shared';

export const isDriveTrashFolderNode = (node: DriveNode | null | undefined): node is FolderNode =>
  node?.type === 'folder' && (node.systemType === 'trash' || node.name === '.Trash');

/** 从当前目录 nodeId 解析可挂载资源的 tagId */
export const resolveCurrentFolderTagId = (
  currentNodeId: string,
  pathNodes: DriveNode[]
): string | undefined => {
  const decoded = decodeNodeId(currentNodeId);
  if (decoded.kind === 'folder') {
    return decoded.tagId;
  }
  if (decoded.kind === 'root') {
    const root = pathNodes.find((node) => node.type === 'root');
    return root?.canMountResources ? root.tagId : undefined;
  }
  return undefined;
};

/** 解析资源在个人盘的主挂载 tagId */
export const resolveResourcePrimaryTagId = (resource: ResourceItem): string | undefined => {
  if (resource.mainTagId) {
    return resource.mainTagId;
  }
  const personalBind =
    resource.tagBinds?.find((bind) => bind.groupId?.startsWith('p_')) ?? resource.tagBinds?.[0];
  if (personalBind?.primaryTagId) {
    return personalBind.primaryTagId;
  }
  return Object.keys(resource.currentTags ?? {})[0];
};

/** 上传完成后挂载到目标文件夹：对齐 Drive moveResourceNode 的 tagIds 构造 */
export const buildUploadedResourceMountTagIds = (
  resource: ResourceItem,
  targetTagId: string
): string[] => {
  const normalizedTargetTagId = targetTagId.trim();
  const currentTags = Object.keys(resource.currentTags ?? {});
  const folderTagId = resolveResourcePrimaryTagId(resource);

  if (!folderTagId || folderTagId === normalizedTargetTagId) {
    return [
      normalizedTargetTagId,
      ...currentTags.filter((tagId) => tagId !== normalizedTargetTagId),
    ];
  }

  const linkTagIds = currentTags.filter(
    (tagId) => tagId !== folderTagId && tagId !== normalizedTargetTagId
  );
  return [normalizedTargetTagId, ...linkTagIds];
};

/** 将资源挂载到指定文件夹 tag */
export const mountResourceToFolderTag = async (params: {
  resourceId: string;
  targetTagId: string;
  documentService: IDocumentService;
  resourceService: IResourceService;
  groupId?: string;
}): Promise<void> => {
  const tagId = params.targetTagId.trim();
  if (!tagId) return;

  const tagPayload = {
    resourceId: params.resourceId,
    ...(params.groupId ? { groupId: params.groupId } : {}),
  };

  try {
    const { resourceInfo } = await params.documentService.getDocInfo(params.resourceId);
    if (resolveResourcePrimaryTagId(resourceInfo) === tagId) {
      return;
    }
    await params.resourceService.updateResourceTags({
      ...tagPayload,
      tagIds: buildUploadedResourceMountTagIds(resourceInfo, tagId),
      primaryTagId: tagId,
    });
  } catch {
    await params.resourceService.updateResourceTags({
      ...tagPayload,
      tagIds: [tagId],
      primaryTagId: tagId,
    });
  }
};

export const toDriveSelectionItem = (node: DriveNode): DriveSelectionItem | null => {
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
