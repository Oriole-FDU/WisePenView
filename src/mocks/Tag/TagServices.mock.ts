import type { FlatTagTreeNode, ITagService, TagTreeNode } from '@/services/Tag';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type TagMockJson = { tagTree: TagTreeNode[]; flatTagTree: FlatTagTreeNode[] };
const md = mockdata as TagMockJson;

const tagTree = md.tagTree;
/** 与 tagTree 独立配置的平铺列表（勿含路径标签 / 前缀，与真实接口语义一致） */
const flatTagTreeRaw = md.flatTagTree;

const getTagTree = async (
  _params?: Parameters<ITagService['getTagTree']>[0]
): Promise<TagTreeNode[]> => {
  await delay(200);
  return tagTree;
};

const getFlatTagTree = async (
  _params?: Parameters<ITagService['getFlatTagTree']>[0]
): Promise<FlatTagTreeNode[]> => {
  await delay(200);
  return flatTagTreeRaw;
};

const updateTag = async (): Promise<void> => {
  await delay(150);
};

const addTag = async (): Promise<string> => {
  await delay(150);
  return 'tag-new-id';
};

const deleteTag = async (): Promise<void> => {
  await delay(150);
};

const moveTag = async (): Promise<void> => {
  await delay(150);
};

export const TagServicesMock: ITagService = {
  getTagTree,
  getFlatTagTree,
  updateTag,
  addTag,
  deleteTag,
  moveTag,
};
