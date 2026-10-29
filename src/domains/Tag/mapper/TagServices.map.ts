import { normalizeResourceActions } from '@/domains/_shared/access';
import { normalizeUserDisplayBaseFromApi } from '@/domains/User/mapper/userEnum.mapper';

import type {
  AddTagApiRequest,
  ChangeTagApiRequest,
  GetTagTreeApiResponse,
} from '../apis/TagApi.contract';
import type { TagMetaInfo, TagTreeNode } from '../entity/tag';
import type { TagCreateRequest, TagUpdateRequest } from '../service/index.type';

const parseTagMetaInfo = (value: string | null | undefined): TagMetaInfo | undefined => {
  if (!value?.trim()) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined;
    const record = parsed as Record<string, unknown>;
    const { schema, sortOrder, ...extensions } = record;
    return {
      ...extensions,
      ...(typeof schema === 'string' ? { schema } : {}),
      ...(typeof sortOrder === 'number' && Number.isFinite(sortOrder) ? { sortOrder } : {}),
    };
  } catch {
    // fallback：兼容历史或其他客户端写入的非 JSON 元数据，排序能力按未设置处理。
    return undefined;
  }
};

const serializeTagMetaInfo = (value: TagMetaInfo | undefined): string | undefined =>
  value === undefined ? undefined : JSON.stringify(value);

const sortTagTreeNodes = (nodes: TagTreeNode[]): TagTreeNode[] =>
  nodes
    .map((node, originalIndex) => ({
      node: {
        ...node,
        children: node.children ? sortTagTreeNodes(node.children) : undefined,
      },
      originalIndex,
    }))
    .sort((left, right) => {
      const leftOrder = left.node.tagMetaInfo?.sortOrder;
      const rightOrder = right.node.tagMetaInfo?.sortOrder;
      if (leftOrder !== undefined && rightOrder !== undefined && leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      if (leftOrder !== undefined && rightOrder === undefined) return -1;
      if (leftOrder === undefined && rightOrder !== undefined) return 1;
      return left.originalIndex - right.originalIndex;
    })
    .map(({ node }) => node);

const mapTagTreeNodeFromApi = (node: GetTagTreeApiResponse[number]): TagTreeNode => {
  return {
    tagId: node.tagId,
    tagName: node.tagName,
    groupId: node.groupId,
    tagDesc: node.tagDesc ?? undefined,
    tagIcon: node.tagIcon ?? undefined,
    tagColor: node.tagColor ?? undefined,
    tagMetaInfo: parseTagMetaInfo(node.tagMetaInfo),
    tagCreator: node.tagCreator ?? undefined,
    creatorInfo: normalizeUserDisplayBaseFromApi(node.creatorInfo),
    isPath: node.isPath,
    taggedResourceAclGrantScope: node.taggedResourceAclGrantScope ?? undefined,
    taggedResourceAclGrantSpecifiedUsers: node.taggedResourceAclGrantSpecifiedUsers ?? undefined,
    tagMountPermissionScope: node.tagMountPermissionScope ?? undefined,
    tagMountSpecifiedUsers: node.tagMountSpecifiedUsers ?? undefined,
    grantedActions: normalizeResourceActions(node.grantedActions),
    parentId: node.parentId,
    children: node.children.map(mapTagTreeNodeFromApi),
  };
};

const mapTagTreeFromApi = (data: GetTagTreeApiResponse): TagTreeNode[] =>
  sortTagTreeNodes(data.map(mapTagTreeNodeFromApi));

const mapAddTagRequest = (params: TagCreateRequest): AddTagApiRequest => ({
  groupId: params.groupId,
  parentId: params.parentId,
  tagName: params.tagName,
  tagDesc: params.tagDesc,
  tagIcon: params.tagIcon,
  tagColor: params.tagColor,
  tagMetaInfo: serializeTagMetaInfo(params.tagMetaInfo),
  taggedResourceAclGrantScope: params.taggedResourceAclGrantScope,
  taggedResourceAclGrantSpecifiedUsers: params.taggedResourceAclGrantSpecifiedUsers,
  tagMountPermissionScope: params.tagMountPermissionScope,
  tagMountSpecifiedUsers: params.tagMountSpecifiedUsers,
  grantedActions: params.grantedActions
    ? normalizeResourceActions(params.grantedActions)
    : undefined,
});

const mapUpdateTagRequest = (params: TagUpdateRequest): ChangeTagApiRequest => ({
  groupId: params.groupId,
  targetTagId: params.targetTagId,
  tagName: params.tagName,
  tagDesc: params.tagDesc,
  tagIcon: params.tagIcon,
  tagColor: params.tagColor,
  tagMetaInfo: serializeTagMetaInfo(params.tagMetaInfo),
  taggedResourceAclGrantScope: params.taggedResourceAclGrantScope,
  taggedResourceAclGrantSpecifiedUsers: params.taggedResourceAclGrantSpecifiedUsers,
  tagMountPermissionScope: params.tagMountPermissionScope,
  tagMountSpecifiedUsers: params.tagMountSpecifiedUsers,
  grantedActions: params.grantedActions
    ? normalizeResourceActions(params.grantedActions)
    : undefined,
});

export const TagServicesMap = {
  mapTagTreeFromApi,
  mapAddTagRequest,
  mapUpdateTagRequest,
};
