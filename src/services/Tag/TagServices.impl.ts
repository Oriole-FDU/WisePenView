import type { ApiResponse } from '@/types/api';
import Axios from '@/utils/Axios';
import { normalizeTagGroupId } from '@/utils/normalizeTagGroupId';
import { checkResponse } from '@/utils/response';
import { ResourceServicesImpl } from '@/services/Resource/ResourceServices.impl';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/services/Resource/index.type';
import type { TagListByTagResponse } from '@/types/tag';
import type {
  TagTreeResponse,
  TagTreeNode,
  TagCreateRequest,
  TagUpdateRequest,
  TagDeleteRequest,
  TagMoveRequest,
  GetResByTagRequest,
  ITagService,
} from './index.type';

/** 模块级缓存，按 groupId 存储已拉取的标签树；写操作后通过 clearTagTreeCache 清除 */
const tagTreeCache = new Map<string, TagTreeNode[]>();
/** 扁平索引：cacheKey → (tagId → TagTreeNode)，与 tagTreeCache 同步维护 */
const tagFlatCache = new Map<string, Map<string, TagTreeNode>>();
const CACHE_KEY_DEFAULT = '__default__';

const buildFlatMap = (roots: TagTreeNode[]): Map<string, TagTreeNode> => {
  const map = new Map<string, TagTreeNode>();
  const walk = (node: TagTreeNode) => {
    map.set(node.tagId, node);
    (node.children ?? []).forEach(walk);
  };
  roots.forEach(walk);
  return map;
};

const clearTagTreeCache = (groupId?: string): void => {
  if (groupId !== undefined) {
    const cacheKey = normalizeTagGroupId(groupId) ?? CACHE_KEY_DEFAULT;
    tagTreeCache.delete(cacheKey);
    tagFlatCache.delete(cacheKey);
  } else {
    tagTreeCache.clear();
    tagFlatCache.clear();
  }
};

const getTagTree = async (groupId?: string): Promise<TagTreeNode[]> => {
  const normalizedGroupId = normalizeTagGroupId(groupId);

  const cacheKey = normalizedGroupId ?? CACHE_KEY_DEFAULT;
  const cached = tagTreeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const params = normalizedGroupId ? { groupId: normalizedGroupId } : undefined;
  const res = (await Axios.get('/resource/tag/getTagTree', { params })) as ApiResponse<
    TagTreeResponse[]
  >;
  checkResponse(res);
  // 过滤掉 tagName，分割folder和tag
  if (Array.isArray(res.data)) {
    res.data = res.data.filter((item) => !(item.tagName && item.tagName.startsWith('/')));
  }

  const roots: TagTreeNode[] = res.data ?? [];
  tagTreeCache.set(cacheKey, roots);
  tagFlatCache.set(cacheKey, buildFlatMap(roots));
  return roots;
};

const getTagById = (tagId: string, groupId?: string): TagTreeNode | undefined => {
  const cacheKey = normalizeTagGroupId(groupId) ?? CACHE_KEY_DEFAULT;
  return tagFlatCache.get(cacheKey)?.get(tagId);
};

const updateTag = async (params: TagUpdateRequest): Promise<void> => {
  const res = (await Axios.post('/resource/tag/changeTag', params)) as ApiResponse;
  checkResponse(res);
  clearTagTreeCache(params.groupId);
};

const addTag = async (params: TagCreateRequest): Promise<string> => {
  const res = (await Axios.post('/resource/tag/addTag', params)) as ApiResponse<string>;
  checkResponse(res);
  clearTagTreeCache(params.groupId);
  return res.data ?? '';
};

const deleteTag = async (params: TagDeleteRequest): Promise<void> => {
  const res = (await Axios.post('/resource/tag/removeTag', params)) as ApiResponse;
  checkResponse(res);
  clearTagTreeCache(params.groupId);
};

const getResByTag = async (params: GetResByTagRequest): Promise<TagListByTagResponse> => {
  const targetTag = params.tag;
  await getTagTree(targetTag.groupId);
  const tag = getTagById(targetTag.tagId, targetTag.groupId);
  const tags = tag?.children ?? [];
  const filePage = params.filePage ?? 1;
  const filePageSize = params.filePageSize ?? 20;

  const res = await ResourceServicesImpl.getUserResources({
    page: filePage,
    size: filePageSize,
    sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
    sortDir: RESOURCE_SORT_DIR.DESC,
    tagIds: [targetTag.tagId],
    tagQueryLogicMode: 'AND',
  });

  return { tags, files: res.list, totalFiles: res.total };
};

const moveTag = async (params: TagMoveRequest): Promise<void> => {
  const res = (await Axios.post('/resource/tag/moveTag', params)) as ApiResponse;
  checkResponse(res);
  clearTagTreeCache(params.groupId);
};

export const TagServicesImpl: ITagService = {
  getTagTree,
  getTagById,
  getResByTag,
  updateTag,
  addTag,
  deleteTag,
  moveTag,
};
