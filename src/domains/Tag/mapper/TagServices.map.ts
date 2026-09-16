import {
  ACCESS_CONTROL_SCOPE,
  type AccessControlScope,
  coerceResourceActions,
  normalizeResourceActions,
  permissionCodeToActions,
  resourceActionsToApiKeys,
  TAG_VISIBILITY_MODE,
  type TagResourceAction,
  type TagVisibilityModeString,
} from '@/domains/Tag';
import { normalizeUserDisplayBaseFromApi } from '@/domains/User/mapper/userEnum.mapper';
import { normalizeTagGroupId } from '@/utils/normalize/normalizeTagGroupId';

import type {
  AddTagApiRequest,
  ChangeTagApiRequest,
  GetTagTreeApiRequest,
  GetTagTreeApiResponse,
} from '../apis/TagApi.type';
import type { TagMetaInfo, TagTreeNode } from '../entity/tag';
import type { TagCreateRequest, TagUpdateRequest } from '../service/index.type';

const mapGetTagTreeRequest = (groupId?: string): GetTagTreeApiRequest | undefined => {
  const normalizedGroupId = normalizeTagGroupId(groupId);
  return normalizedGroupId
    ? {
        groupId: normalizedGroupId,
      }
    : undefined;
};

const isTagVisibilityModeString = (value: unknown): value is TagVisibilityModeString =>
  typeof value === 'string' && TAG_VISIBILITY_MODE.getKey(value) != null;

const coerceAccessControlScope = (value: unknown): AccessControlScope | undefined => {
  if (typeof value === 'number' && value in ACCESS_CONTROL_SCOPE.configs) {
    return value as AccessControlScope;
  }
  if (typeof value !== 'string') return undefined;
  const byKey = (ACCESS_CONTROL_SCOPE.values as Record<string, number>)[value];
  if (byKey !== undefined) return byKey as AccessControlScope;
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && asNumber in ACCESS_CONTROL_SCOPE.configs) {
    return asNumber as AccessControlScope;
  }
  return undefined;
};

const coercePermissionMask = (mask: unknown): number | undefined => {
  if (typeof mask === 'number' && Number.isFinite(mask)) return mask;
  if (typeof mask !== 'string') return undefined;
  const parsed = Number(mask);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const mapGrantedActionsFromApi = (
  actions: unknown,
  grantedActionsMask: unknown
): TagResourceAction[] | undefined => {
  const mask = coercePermissionMask(grantedActionsMask);
  if (Array.isArray(actions)) {
    const resolvedActions = coerceResourceActions(actions);
    if (resolvedActions.length > 0 || !mask) return resolvedActions;
  }
  if (mask === undefined) return undefined;
  return normalizeResourceActions(permissionCodeToActions(mask));
};

const parseTagMetaInfo = (value: string | undefined): TagMetaInfo | undefined => {
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
  const visibilityMode = node.visibilityMode;
  const tagMetaInfo = parseTagMetaInfo(node.tagMetaInfo);
  const normalizedVisibilityMode = isTagVisibilityModeString(visibilityMode)
    ? visibilityMode
    : undefined;

  return {
    ...node,
    tagMetaInfo,
    creatorInfo: normalizeUserDisplayBaseFromApi(node.creatorInfo),
    // fallback：兼容后端返回未约束的 visibilityMode 字符串
    visibilityMode: normalizedVisibilityMode,
    taggedResourceAclGrantScope: coerceAccessControlScope(node.taggedResourceAclGrantScope),
    tagMountPermissionScope: coerceAccessControlScope(node.tagMountPermissionScope),
    // fallback：兼容后端返回枚举名字符串、历史 number[] 或仅返回 mask 的 grantedActions
    grantedActions: mapGrantedActionsFromApi(
      node.grantedActions,
      node.taggedResourceGrantedActionsMask
    ),
    children: node.children?.map(mapTagTreeNodeFromApi),
  };
};

const mapTagTreeFromApi = (data: GetTagTreeApiResponse): TagTreeNode[] =>
  sortTagTreeNodes(data.map(mapTagTreeNodeFromApi));

const mapTagGrantedActions = (
  roots: TagTreeNode[]
): ReadonlyMap<string, TagResourceAction[] | undefined> => {
  const actionsByTagId = new Map<string, TagResourceAction[] | undefined>();
  const walk = (node: TagTreeNode) => {
    actionsByTagId.set(node.tagId, node.grantedActions);
    node.children?.forEach(walk);
  };
  roots.forEach(walk);
  return actionsByTagId;
};

const mapAddTagRequest = (params: TagCreateRequest): AddTagApiRequest => ({
  ...params,
  tagMetaInfo: serializeTagMetaInfo(params.tagMetaInfo),
  grantedActions: resourceActionsToApiKeys(params.grantedActions),
});

const mapUpdateTagRequest = (params: TagUpdateRequest): ChangeTagApiRequest => ({
  ...params,
  tagMetaInfo: serializeTagMetaInfo(params.tagMetaInfo),
  grantedActions: resourceActionsToApiKeys(params.grantedActions),
});

const mapAddTagFromApi = (data: string): string => {
  // fallback：旧接口可能返回空 data，保持原有空串行为
  return data ?? '';
};

export const TagServicesMap = {
  mapGetTagTreeRequest,
  mapTagTreeFromApi,
  mapTagGrantedActions,
  mapAddTagRequest,
  mapUpdateTagRequest,
  mapAddTagFromApi,
  parseTagMetaInfo,
  serializeTagMetaInfo,
  sortTagTreeNodes,
};
