import { mockResponse } from '@/domains/_shared/mock/response';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { TagApi as TagApiContract } from '../apis/TagApi';
import type { TagTreeApiResponse } from '../apis/TagApi.schema';
import mockdata from './mockdata.json';

const PERSONAL_MOCK_GROUP_ID = 'p_mock-user';
const MOCK_CURRENT_USER_ID = '10086';

type TagTreeMockNode = Pick<TagTreeApiResponse[number], 'tagId' | 'tagName'> &
  Partial<Omit<TagTreeApiResponse[number], 'tagId' | 'tagName' | 'children' | 'creatorInfo'>> & {
    creatorInfo?: Partial<NonNullable<TagTreeApiResponse[number]['creatorInfo']>> | null;
    children?: TagTreeMockNode[];
  };

const normalizeCreatorInfo = (
  creatorInfo: Partial<NonNullable<TagTreeApiResponse[number]['creatorInfo']>> | null | undefined
): TagTreeApiResponse[number]['creatorInfo'] =>
  creatorInfo
    ? {
        nickname: creatorInfo.nickname ?? null,
        username: creatorInfo.username ?? null,
        avatar: creatorInfo.avatar ?? null,
        identityType: creatorInfo.identityType ?? null,
        realName: creatorInfo.realName ?? null,
        campusNo: creatorInfo.campusNo ?? null,
        email: creatorInfo.email ?? null,
        mobile: creatorInfo.mobile ?? null,
      }
    : null;

const normalizeTagTree = (nodes: TagTreeMockNode[], fallbackGroupId: string): TagTreeApiResponse =>
  nodes.map((node) => {
    const groupId = node.groupId ?? fallbackGroupId;
    return {
      tagId: node.tagId,
      parentId: node.parentId || '0',
      groupId,
      tagName: node.tagName,
      tagDesc: node.tagDesc ?? null,
      tagIcon: node.tagIcon ?? null,
      tagColor: node.tagColor ?? null,
      tagMetaInfo: node.tagMetaInfo ?? null,
      tagCreator: node.tagCreator ?? null,
      isPath: node.isPath ?? false,
      creatorInfo: normalizeCreatorInfo(node.creatorInfo),
      taggedResourceAclGrantScope: node.taggedResourceAclGrantScope ?? null,
      taggedResourceAclGrantSpecifiedUsers: node.taggedResourceAclGrantSpecifiedUsers ?? null,
      tagMountPermissionScope: node.tagMountPermissionScope ?? null,
      tagMountSpecifiedUsers: node.tagMountSpecifiedUsers ?? null,
      grantedActions: node.grantedActions ?? [],
      children: normalizeTagTree(node.children ?? [], groupId),
    };
  });

const trees: Record<string, TagTreeApiResponse> = Object.fromEntries(
  Object.entries(mockdata).map(([groupId, nodes]) => [
    groupId,
    normalizeTagTree(nodes as TagTreeMockNode[], groupId || PERSONAL_MOCK_GROUP_ID),
  ])
);

const roots = (groupId = '') => (trees[groupId] ??= []);
const findTag = (nodes: TagTreeApiResponse, id: string): TagTreeApiResponse[number] | undefined => {
  for (const node of nodes) {
    if (node.tagId === id) return node;
    const child = findTag(node.children, id);
    if (child) return child;
  }
};
const detach = (nodes: TagTreeApiResponse, id: string): TagTreeApiResponse[number] | undefined => {
  const index = nodes.findIndex((node) => node.tagId === id);
  if (index >= 0) return nodes.splice(index, 1)[0];
  for (const node of nodes) {
    const removed = detach(node.children, id);
    if (removed) return removed;
  }
};
const requireTag = (id: string, groupId?: string) => {
  const node = findTag(roots(groupId), id);
  if (!node) throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'tagId' });
  return node;
};
const children = (parentId?: string, groupId?: string) =>
  !parentId || parentId === '0' ? roots(groupId) : requireTag(parentId, groupId).children;

export const TagApi: typeof TagApiContract = {
  getTagTree: (params?: { groupId?: string }) => mockResponse(roots(params?.groupId)),
  addTag: async (params) => {
    const tagId = `mock-tag-${crypto.randomUUID()}`;
    const parent = params.parentId ? requireTag(params.parentId, params.groupId) : undefined;
    children(params.parentId, params.groupId).push({
      tagId,
      parentId: params.parentId ?? '0',
      groupId: params.groupId ?? PERSONAL_MOCK_GROUP_ID,
      tagName: params.tagName,
      tagDesc: params.tagDesc ?? null,
      tagIcon: params.tagIcon ?? null,
      tagColor: params.tagColor ?? null,
      tagMetaInfo: params.tagMetaInfo ?? null,
      tagCreator: MOCK_CURRENT_USER_ID,
      isPath: parent?.isPath ?? false,
      creatorInfo: null,
      taggedResourceAclGrantScope: params.taggedResourceAclGrantScope ?? null,
      taggedResourceAclGrantSpecifiedUsers: params.taggedResourceAclGrantSpecifiedUsers ?? null,
      tagMountPermissionScope: params.tagMountPermissionScope ?? null,
      tagMountSpecifiedUsers: params.tagMountSpecifiedUsers ?? null,
      grantedActions: params.grantedActions ?? [],
      children: [],
    });
    return tagId;
  },
  changeTag: async ({ targetTagId, ...params }) => {
    const tag = requireTag(targetTagId, params.groupId);
    Object.assign(tag, params);
    return null;
  },
  removeTags: async ({ groupId, targetTagIds }) => {
    new Set(targetTagIds).forEach((id) => detach(roots(groupId), id));
    return null;
  },
  moveTags: async ({ groupId, targetTagIds, newParentId }) => {
    const target = children(newParentId, groupId);
    const moving = Array.from(new Set(targetTagIds)).map((id) => requireTag(id, groupId));
    if (
      moving.some(
        (node) => node.tagId === newParentId || (newParentId && findTag(node.children, newParentId))
      )
    ) {
      throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'newParentId' });
    }
    for (const node of moving) {
      detach(roots(groupId), node.tagId);
      node.parentId = newParentId ?? '0';
      target.push(node);
    }
    return null;
  },
};
