import type { ResourceItem } from '@/domains/Resource';
import type {
  GetResByTagRequest,
  ITagService,
  TagListByTagResponse,
  TagTreeNode,
} from '@/domains/Tag';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type TagMockJson = { tagTree: TagTreeNode[] };
const md = mockdata as TagMockJson;

const tagTree = md.tagTree;

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

const mockFilesByTagId: Record<string, ResourceItem[]> = {
  'tag-work': [
    {
      resourceId: 'res-w-001',
      resourceName: '工作计划.docx',
      ownerInfo: {},
      resourceType: 'FILE',
      size: 15360,
      currentTags: { 'tag-work': '工作' },
    },
    {
      resourceId: 'res-w-002',
      resourceName: '会议总结',
      ownerInfo: {},
      resourceType: 'NOTE',
      size: 4096,
      currentTags: { 'tag-work': '工作' },
    },
  ],
  'tag-work-project-a': [
    {
      resourceId: 'res-pa-001',
      resourceName: '项目A需求文档.md',
      ownerInfo: {},
      resourceType: 'NOTE',
      size: 8192,
      currentTags: { 'tag-work-project-a': '项目A' },
    },
  ],
  'tag-study-tech': [
    {
      resourceId: 'res-st-001',
      resourceName: 'React笔记',
      ownerInfo: {},
      resourceType: 'NOTE',
      size: 6144,
      currentTags: { 'tag-study-tech': '技术' },
    },
    {
      resourceId: 'res-st-002',
      resourceName: 'TypeScript手册.pdf',
      ownerInfo: {},
      resourceType: 'FILE',
      size: 102400,
      currentTags: { 'tag-study-tech': '技术' },
    },
  ],
  'tag-life-reading': [
    {
      resourceId: 'res-lr-001',
      resourceName: '2024书单',
      ownerInfo: {},
      resourceType: 'NOTE',
      size: 3072,
      currentTags: { 'tag-life-reading': '阅读' },
    },
  ],
};

const getTagTree = async (): Promise<TagTreeNode[]> => {
  await delay(200);
  flatMap = buildFlatMap(tagTree);
  return tagTree;
};

const getRawTagTree = async (): Promise<TagTreeNode[]> => {
  await delay(200);
  flatMap = buildFlatMap(tagTree);
  return tagTree;
};

const getTagById = (tagId: string): TagTreeNode | undefined => {
  if (!flatMap) flatMap = buildFlatMap(tagTree);
  return flatMap.get(tagId);
};

const getRawTagById = (tagId: string): TagTreeNode | undefined => {
  if (!flatMap) flatMap = buildFlatMap(tagTree);
  return flatMap.get(tagId);
};

const getResByTag = async (params: GetResByTagRequest): Promise<TagListByTagResponse> => {
  await delay(250);
  if (!flatMap) flatMap = buildFlatMap(tagTree);
  const tag = flatMap.get(params.tag.tagId);
  const tags = tag?.children ?? [];
  const allFiles = mockFilesByTagId[params.tag.tagId] ?? [];
  const totalFiles = allFiles.length;

  const page = params.filePage ?? 1;
  const pageSize = params.filePageSize ?? 20;
  const start = (page - 1) * pageSize;
  const files = allFiles.slice(start, start + pageSize);

  return { tags, files, totalFiles };
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
  getRawTagTree,
  getRawTagById,
  getTagTree,
  getTagById,
  getResByTag,
  updateTag,
  addTag,
  deleteTag,
  moveTag,
};
