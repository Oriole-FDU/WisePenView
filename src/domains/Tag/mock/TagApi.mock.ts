import { mockResponse } from '@/domains/_shared/mock/response';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { TagApi as TagApiContract } from '../apis/TagApi';
import type { TagTreeApiResponse } from '../apis/TagApi.type';
import mockdata from './mockdata.json';

type TagTreeMockNode = Omit<TagTreeApiResponse, 'children' | 'grantedActions'> & {
  grantedActions?: TagTreeApiResponse['grantedActions'];
  children?: TagTreeMockNode[];
};

const normalizeTagTree = (nodes: TagTreeMockNode[]): TagTreeApiResponse[] =>
  nodes.map(({ children, grantedActions, ...node }) => ({
    ...node,
    grantedActions: grantedActions ?? [],
    children: normalizeTagTree(children ?? []),
  }));

const trees: Record<string, TagTreeApiResponse[]> = Object.fromEntries(
  Object.entries(structuredClone(mockdata)).map(([groupId, nodes]) => [
    groupId,
    normalizeTagTree(nodes as TagTreeMockNode[]),
  ])
);
const roots = (groupId = '') => (trees[groupId] ??= []);
const findTag = (nodes: TagTreeApiResponse[], id: string): TagTreeApiResponse | undefined => {
  for (const node of nodes) {
    if (node.tagId === id) return node;
    const child = findTag(node.children ?? [], id);
    if (child) return child;
  }
};
const detach = (nodes: TagTreeApiResponse[], id: string): TagTreeApiResponse | undefined => {
  const index = nodes.findIndex((node) => node.tagId === id);
  if (index >= 0) return nodes.splice(index, 1)[0];
  for (const node of nodes) {
    const removed = detach(node.children ?? [], id);
    if (removed) return removed;
  }
};
const requireTag = (id: string, groupId?: string) => {
  const node = findTag(roots(groupId), id);
  if (!node) throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'tagId' });
  return node;
};
const children = (parentId?: string, groupId?: string) =>
  !parentId || parentId === '0' ? roots(groupId) : (requireTag(parentId, groupId).children ??= []);

export const TagApi: typeof TagApiContract = {
  getTagTree: (params) => mockResponse(roots(params?.groupId)),
  addTag: async (params) => {
    const tagId = `mock-tag-${crypto.randomUUID()}`;
    children(params.parentId, params.groupId).push({
      ...params,
      tagId,
      parentId: params.parentId ?? '0',
      grantedActions: params.grantedActions ?? [],
      children: [],
    });
    return tagId;
  },
  changeTag: async ({ targetTagId, ...params }) => {
    const tag = requireTag(targetTagId, params.groupId);
    const { grantedActions, ...tagInfo } = params;
    Object.assign(tag, tagInfo);
    if (grantedActions !== undefined) tag.grantedActions = grantedActions;
  },
  removeTags: async ({ groupId, targetTagIds }) => {
    targetTagIds.forEach((id) => detach(roots(groupId), id));
  },
  moveTags: async ({ groupId, targetTagIds, newParentId }) => {
    const target = children(newParentId, groupId);
    const moving = targetTagIds.map((id) => requireTag(id, groupId));
    if (
      moving.some(
        (node) =>
          node.tagId === newParentId || (newParentId && findTag(node.children ?? [], newParentId))
      )
    ) {
      throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'newParentId' });
    }
    for (const node of moving) {
      detach(roots(groupId), node.tagId);
      node.parentId = newParentId ?? '0';
      target.push(node);
    }
  },
};
