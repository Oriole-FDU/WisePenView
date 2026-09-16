import type { ITagService, TagTreeNode } from '@/domains/Tag';
import { TAG_META_SCHEMA } from '@/domains/Tag';

import { TagServicesMap } from '../mapper/TagServices.map';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type TagMockJson = { tagTree: TagTreeNode[] };
const md = mockdata as TagMockJson;

let tagTree = md.tagTree;

let flatMap: Map<string, TagTreeNode> | null = null;

const buildFlatMap = (roots: TagTreeNode[]): Map<string, TagTreeNode> => {
  const map = new Map<string, TagTreeNode>();
  const walk = (node: TagTreeNode) => {
    map.set(node.tagId, node);
    (node.children ?? []).forEach(walk);
  };
  roots.forEach(walk);
  return map;
};

const getTagTree = async (): Promise<TagTreeNode[]> => {
  await delay(200);
  tagTree = TagServicesMap.sortTagTreeNodes(tagTree);
  flatMap = buildFlatMap(tagTree);
  return tagTree;
};

const getRawTagTree = async (): Promise<TagTreeNode[]> => {
  await delay(200);
  tagTree = TagServicesMap.sortTagTreeNodes(tagTree);
  flatMap = buildFlatMap(tagTree);
  return tagTree;
};

const getTagById = (tagId: string): TagTreeNode | undefined => {
  if (!flatMap) flatMap = buildFlatMap(tagTree);
  return flatMap.get(tagId);
};

const getTagGrantedActions: ITagService['getTagGrantedActions'] = async () => {
  await delay(200);
  return TagServicesMap.mapTagGrantedActions(TagServicesMap.sortTagTreeNodes(tagTree));
};

const getRawTagById = (tagId: string): TagTreeNode | undefined => {
  if (!flatMap) flatMap = buildFlatMap(tagTree);
  return flatMap.get(tagId);
};

const updateTag = async (): Promise<void> => {
  await delay(150);
};

const addTag = async (): Promise<string> => {
  await delay(150);
  return 'tag-new-id';
};

const removeTags = async (): Promise<void> => {
  await delay(150);
};

const moveTags = async (): Promise<void> => {
  await delay(150);
};

const reorderSiblingTags: ITagService['reorderSiblingTags'] = async ({ orderedTagIds }) => {
  await delay(150);
  if (!flatMap) flatMap = buildFlatMap(tagTree);
  orderedTagIds.forEach((tagId, index) => {
    const node = flatMap?.get(tagId);
    if (!node) return;
    node.tagMetaInfo = {
      ...node.tagMetaInfo,
      schema: node.tagMetaInfo?.schema ?? TAG_META_SCHEMA,
      sortOrder: (index + 1) * 1024,
    };
  });
  tagTree = TagServicesMap.sortTagTreeNodes(tagTree);
  flatMap = buildFlatMap(tagTree);
};

export const TagServicesMock: ITagService = {
  getTagGrantedActions,
  getRawTagTree,
  getRawTagById,
  getTagTree,
  getTagById,
  updateTag,
  addTag,
  removeTags,
  moveTags,
  reorderSiblingTags,
};
