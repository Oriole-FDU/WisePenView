import { registerServiceCacheCleaner } from '@/domains/_shared/cacheRegistry';
import { createTtlCache } from '@/domains/_shared/ttlCache';
import { TAG_META_SCHEMA, type TagTreeNode } from '@/domains/Tag';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { normalizeTagGroupId } from '@/utils/normalize/normalizeTagGroupId';
import { TagApi } from '@domain-apis';
import { TagServicesMap } from '../mapper/TagServices.map';
import type {
  ITagService,
  MoveTagsRequest,
  RemoveTagsRequest,
  ReorderSiblingTagsRequest,
  TagCreateRequest,
  TagUpdateRequest,
} from './index.type';

const CACHE_KEY_DEFAULT = '__default__';
const TAG_TREE_CACHE_TTL_MS = 15_000;
/** 系统保留前缀：以 `.` 开头的 tag（如 `.Trash`）对 Tag 视图不可见 */
const HIDDEN_TAG_PREFIX = '.';
const TAG_SORT_ORDER_STEP = 1024;

const buildFlatMap = (roots: TagTreeNode[]): Map<string, TagTreeNode> => {
  const map = new Map<string, TagTreeNode>();
  const walk = (node: TagTreeNode) => {
    map.set(node.tagId, node);
    (node.children ?? []).forEach(walk);
  };
  roots.forEach(walk);
  return map;
};

const filterHiddenTags = (nodes: TagTreeNode[]): TagTreeNode[] => {
  const filtered: TagTreeNode[] = [];
  for (const node of nodes) {
    if ((node.tagName ?? '').trim().startsWith(HIDDEN_TAG_PREFIX)) {
      continue;
    }
    filtered.push({
      ...node,
      children: Array.isArray(node.children) ? filterHiddenTags(node.children) : undefined,
    });
  }
  return filtered;
};

const fetchTagTree = async (groupId?: string): Promise<TagTreeNode[]> => {
  const params = TagServicesMap.mapGetTagTreeRequest(groupId);
  const data = await TagApi.getTagTree(params);
  return TagServicesMap.mapTagTreeFromApi(data);
};

const getTagGrantedActions: ITagService['getTagGrantedActions'] = async (groupId) => {
  const roots = await fetchTagTree(groupId);
  return TagServicesMap.mapTagGrantedActions(roots);
};

export const createTagServices = (): ITagService => {
  /** 按 groupId 存储已拉取的原始标签树；写操作后清除，读缓存自动过期。 */
  const rawTagTreeCache = createTtlCache<string, TagTreeNode[]>(TAG_TREE_CACHE_TTL_MS);
  /** 扁平索引：cacheKey → (tagId → TagTreeNode)，与 rawTagTreeCache 同步维护并自动过期。 */
  const rawTagFlatCache = createTtlCache<string, Map<string, TagTreeNode>>(TAG_TREE_CACHE_TTL_MS);
  /** 按 groupId 存储已拉取的过滤后标签树；写操作后清除，读缓存自动过期。 */
  const tagTreeCache = createTtlCache<string, TagTreeNode[]>(TAG_TREE_CACHE_TTL_MS);
  /** 扁平索引：cacheKey → (tagId → TagTreeNode)，与 tagTreeCache 同步维护并自动过期。 */
  const tagFlatCache = createTtlCache<string, Map<string, TagTreeNode>>(TAG_TREE_CACHE_TTL_MS);
  const clearTagTreeCache = (groupId?: string): void => {
    if (groupId !== undefined) {
      const cacheKey = normalizeTagGroupId(groupId) ?? CACHE_KEY_DEFAULT;
      rawTagTreeCache.delete(cacheKey);
      rawTagFlatCache.delete(cacheKey);
      tagTreeCache.delete(cacheKey);
      tagFlatCache.delete(cacheKey);
    } else {
      rawTagTreeCache.clear();
      rawTagFlatCache.clear();
      tagTreeCache.clear();
      tagFlatCache.clear();
    }
  };

  registerServiceCacheCleaner(() => clearTagTreeCache());

  const getRawTagTree = async (
    groupId?: string,
    options?: { refresh?: boolean }
  ): Promise<TagTreeNode[]> => {
    const normalizedGroupId = normalizeTagGroupId(groupId);
    const cacheKey = normalizedGroupId ?? CACHE_KEY_DEFAULT;
    const cached = rawTagTreeCache.get(cacheKey);
    if (cached && !options?.refresh) {
      return cached;
    }
    tagTreeCache.delete(cacheKey);
    tagFlatCache.delete(cacheKey);
    const roots = await fetchTagTree(normalizedGroupId);
    rawTagTreeCache.set(cacheKey, roots);
    rawTagFlatCache.set(cacheKey, buildFlatMap(roots));
    return roots;
  };

  const getRawTagById = (tagId: string, groupId?: string): TagTreeNode | undefined => {
    const cacheKey = normalizeTagGroupId(groupId) ?? CACHE_KEY_DEFAULT;
    return rawTagFlatCache.get(cacheKey)?.get(tagId);
  };

  const getTagTree = async (
    groupId?: string,
    options?: { refresh?: boolean }
  ): Promise<TagTreeNode[]> => {
    const normalizedGroupId = normalizeTagGroupId(groupId);
    const cacheKey = normalizedGroupId ?? CACHE_KEY_DEFAULT;
    const cached = tagTreeCache.get(cacheKey);
    if (cached && !options?.refresh) {
      return cached;
    }

    const rawRoots = await getRawTagTree(normalizedGroupId, options);
    // 剥离路径型（folder）与系统保留前缀（`.` 开头）
    const nonFolderRoots: TagTreeNode[] = rawRoots.filter(
      (item) => !(item.tagName && item.tagName.startsWith('/'))
    );
    const roots: TagTreeNode[] = filterHiddenTags(nonFolderRoots);
    tagTreeCache.set(cacheKey, roots);
    tagFlatCache.set(cacheKey, buildFlatMap(roots));
    return roots;
  };

  const getTagById = (tagId: string, groupId?: string): TagTreeNode | undefined => {
    const cacheKey = normalizeTagGroupId(groupId) ?? CACHE_KEY_DEFAULT;
    return tagFlatCache.get(cacheKey)?.get(tagId);
  };

  const updateTag = async (params: TagUpdateRequest): Promise<void> => {
    const payload = TagServicesMap.mapUpdateTagRequest(params);
    await TagApi.changeTag(payload);
    clearTagTreeCache(params.groupId);
  };

  const addTag = async (params: TagCreateRequest): Promise<string> => {
    const payload = TagServicesMap.mapAddTagRequest(params);
    const data = await TagApi.addTag(payload);
    clearTagTreeCache(params.groupId);
    return TagServicesMap.mapAddTagFromApi(data);
  };

  const removeTags = async (params: RemoveTagsRequest): Promise<void> => {
    await TagApi.removeTags(params);
    clearTagTreeCache(params.groupId);
  };

  const moveTags = async (params: MoveTagsRequest): Promise<void> => {
    await TagApi.moveTags(params);
    clearTagTreeCache(params.groupId);
  };

  const reorderSiblingTags = async (params: ReorderSiblingTagsRequest): Promise<void> => {
    const normalizedGroupId = normalizeTagGroupId(params.groupId);
    const cacheKey = normalizedGroupId ?? CACHE_KEY_DEFAULT;
    await getRawTagTree(normalizedGroupId);
    const flatMap = rawTagFlatCache.get(cacheKey);
    const uniqueTagIds = new Set(params.orderedTagIds);
    const nodes = params.orderedTagIds.map((tagId) => flatMap?.get(tagId));
    const parentIds = new Set(nodes.map((node) => node?.parentId ?? '0'));
    if (
      uniqueTagIds.size !== params.orderedTagIds.length ||
      nodes.some((node) => !node) ||
      parentIds.size > 1
    ) {
      throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, {
        field: 'orderedTagIds',
      });
    }

    try {
      for (const [index, node] of nodes.entries()) {
        if (!node) continue;
        const sortOrder = (index + 1) * TAG_SORT_ORDER_STEP;
        if (node.tagMetaInfo?.sortOrder === sortOrder) continue;
        await TagApi.changeTag(
          TagServicesMap.mapUpdateTagRequest({
            groupId: normalizedGroupId,
            targetTagId: node.tagId,
            tagMetaInfo: {
              ...node.tagMetaInfo,
              schema: node.tagMetaInfo?.schema ?? TAG_META_SCHEMA,
              sortOrder,
            },
          })
        );
      }
    } finally {
      // Java 暂无批量排序接口；任一请求失败时也必须失效缓存以反映已成功的部分更新。
      clearTagTreeCache(normalizedGroupId);
    }
  };

  return {
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
};
