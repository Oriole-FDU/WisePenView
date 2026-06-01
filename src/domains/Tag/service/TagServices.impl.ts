import { registerServiceCacheCleaner } from '@/domains/_shared/cacheRegistry';
import type { IResourceService } from '@/domains/Resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/domains/Resource';
import { resourceActionsToApiKeys, type TagListByTagResponse } from '@/domains/Tag';
import { useTrashTagStore } from '@/store';
import { normalizeTagGroupId } from '@/utils/normalize/normalizeTagGroupId';
import { ResourceTagApi } from '../apis/ResourceApi';
import type {
  GetResByTagRequest,
  ITagService,
  TagCreateRequest,
  TagDeleteRequest,
  TagMoveRequest,
  TagTreeNode,
  TagTreeResponse,
  TagUpdateRequest,
} from './index.type';

const CACHE_KEY_DEFAULT = '__default__';
/** 系统保留前缀：以 `.` 开头的 tag（如 `.Trash`）对 Tag 视图不可见 */
const HIDDEN_TAG_PREFIX = '.';
const TRASH_FOLDER_NAME = '.Trash';

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

const syncTrashTagIdToStore = (groupId: string | undefined, roots: TagTreeResponse[]): void => {
  const queue: TagTreeResponse[] = [...roots];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;
    if (node.tagName === TRASH_FOLDER_NAME) {
      useTrashTagStore.getState().setTrashTagId(groupId, node.tagId);
      return;
    }
    if (Array.isArray(node.children) && node.children.length > 0) {
      queue.push(...node.children);
    }
  }
  useTrashTagStore.getState().setTrashTagId(groupId, undefined);
};

export interface TagServicesDeps {
  resourceService: IResourceService;
}

export const createTagServices = (deps: TagServicesDeps): ITagService => {
  const { resourceService } = deps;

  /** 按 groupId 存储已拉取的原始标签树；写操作后通过 clearTagTreeCache 清除 */
  const rawTagTreeCache = new Map<string, TagTreeNode[]>();
  /** 扁平索引：cacheKey → (tagId → TagTreeNode)，与 rawTagTreeCache 同步维护 */
  const rawTagFlatCache = new Map<string, Map<string, TagTreeNode>>();
  /** 按 groupId 存储已拉取的过滤后标签树；写操作后通过 clearTagTreeCache 清除 */
  const tagTreeCache = new Map<string, TagTreeNode[]>();
  /** 扁平索引：cacheKey → (tagId → TagTreeNode)，与 tagTreeCache 同步维护 */
  const tagFlatCache = new Map<string, Map<string, TagTreeNode>>();

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

  const getRawTagTree = async (groupId?: string): Promise<TagTreeNode[]> => {
    const normalizedGroupId = normalizeTagGroupId(groupId);
    const cacheKey = normalizedGroupId ?? CACHE_KEY_DEFAULT;
    const cached = rawTagTreeCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const params = normalizedGroupId ? { groupId: normalizedGroupId } : undefined;
    const data = (await ResourceTagApi.getTagTree(params)) as TagTreeResponse[];
    syncTrashTagIdToStore(normalizedGroupId, data ?? []);
    const roots: TagTreeNode[] = data ?? [];
    rawTagTreeCache.set(cacheKey, roots);
    rawTagFlatCache.set(cacheKey, buildFlatMap(roots));
    return roots;
  };

  const getRawTagById = (tagId: string, groupId?: string): TagTreeNode | undefined => {
    const cacheKey = normalizeTagGroupId(groupId) ?? CACHE_KEY_DEFAULT;
    return rawTagFlatCache.get(cacheKey)?.get(tagId);
  };

  const getTagTree = async (groupId?: string): Promise<TagTreeNode[]> => {
    const normalizedGroupId = normalizeTagGroupId(groupId);
    const cacheKey = normalizedGroupId ?? CACHE_KEY_DEFAULT;
    const cached = tagTreeCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const rawRoots = await getRawTagTree(normalizedGroupId);
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
    await ResourceTagApi.changeTag({
      ...params,
      grantedActions: resourceActionsToApiKeys(params.grantedActions),
    });
    clearTagTreeCache(params.groupId);
  };

  const addTag = async (params: TagCreateRequest): Promise<string> => {
    const data = await ResourceTagApi.addTag({
      ...params,
      grantedActions: resourceActionsToApiKeys(params.grantedActions),
    });
    clearTagTreeCache(params.groupId);
    return data ?? '';
  };

  const deleteTag = async (params: TagDeleteRequest): Promise<void> => {
    await ResourceTagApi.removeTag(params);
    clearTagTreeCache(params.groupId);
  };

  const getResByTag = async (params: GetResByTagRequest): Promise<TagListByTagResponse> => {
    const targetTag = params.tag;
    await getTagTree(targetTag.groupId);
    const tag = getTagById(targetTag.tagId, targetTag.groupId);
    const tags = tag?.children ?? [];
    const filePage = params.filePage ?? 1;
    const filePageSize = params.filePageSize ?? 20;
    const listParams = {
      page: filePage,
      size: filePageSize,
      sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
      sortDir: RESOURCE_SORT_DIR.DESC,
      tagIds: [targetTag.tagId],
      tagQueryLogicMode: 'AND' as const,
    };
    const normalizedGroupId = normalizeTagGroupId(targetTag.groupId);
    const res = normalizedGroupId
      ? await resourceService.getGroupResources({ ...listParams, groupId: normalizedGroupId })
      : await resourceService.getUserResources(listParams);

    return { tags, files: res.list, totalFiles: res.total };
  };

  const moveTag = async (params: TagMoveRequest): Promise<void> => {
    await ResourceTagApi.moveTag(params);
    clearTagTreeCache(params.groupId);
  };

  return {
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
};
