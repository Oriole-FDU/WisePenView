import type { ITagService, TagTreeNode } from '@/services/Tag';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const tagTree = mockdata.tagTree as TagTreeNode[];

const getTagTree = async (
  _params?: Parameters<ITagService['getTagTree']>[0]
): Promise<TagTreeNode[]> => {
  await delay(200);
  return tagTree;
};

const updateTag = async (): Promise<void> => {
  await delay(150);
};

const addTag = async (): Promise<string> => {
  await delay(150);
  return 'tag-new-id';
};

const changeTag = async (): Promise<void> => {
  await delay(150);
};

const removeTag = async (): Promise<void> => {
  await delay(150);
};

const moveTag = async (): Promise<void> => {
  await delay(150);
};

export const TagServicesMock: ITagService = {
  getTagTree,
  updateTag,
  addTag,
  changeTag,
  removeTag,
  moveTag,
};
