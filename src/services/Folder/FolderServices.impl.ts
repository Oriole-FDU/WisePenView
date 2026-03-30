import type { ApiResponse } from '@/types/api';
import type { ResourceItem } from '@/types/resource';
import type { Folder, FolderListByPathResponse } from '@/types/folder';
import { mapTagToFolder } from '@/types/folder';
import type { TagTreeResponse } from '@/services/Tag/index.type';
import Axios from '@/utils/Axios';
import { normalizeTagGroupId } from '@/utils/normalizeTagGroupId';
import { checkResponse } from '@/utils/response';
import { ResourceServicesImpl } from '@/services/Resource/ResourceServices.impl';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/services/Resource/index.type';
import type { IFolderService, GetResByFolderRequest, GetFolderTreeRequest } from './index.type';

/** 模块级缓存，按 groupId 存储已拉取的文件夹树；写操作后通过 clearFolderTreeCache 清除 */
const folderTreeCache = new Map<string, Folder>();
/** 扁平索引：cacheKey → (tagId → Folder)，与 folderTreeCache 同步维护 */
const folderFlatCache = new Map<string, Map<string, Folder>>();
const CACHE_KEY_DEFAULT = '__default__';

const buildFlatMap = (root: Folder): Map<string, Folder> => {
  const map = new Map<string, Folder>();
  const walk = (f: Folder) => {
    map.set(f.tagId, f);
    (f.children ?? []).forEach(walk);
  };
  walk(root);
  return map;
};

const getFolderTree = async (params: GetFolderTreeRequest = {}): Promise<Folder> => {
  const normalizedGroupId = normalizeTagGroupId(params.groupId);
  const cacheKey = normalizedGroupId ?? CACHE_KEY_DEFAULT;
  const cached = folderTreeCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const res = (await Axios.get('/resource/tag/getTagTree', {
    params: normalizedGroupId ? { groupId: normalizedGroupId } : undefined,
  })) as ApiResponse<TagTreeResponse[]>;
  checkResponse(res);
  const tags = res.data ?? [];
  const rootTag = tags.find((tag) => tag.tagName === '/');
  if (!rootTag) {
    throw new Error('未能加载根文件夹');
  }
  const root = mapTagToFolder(rootTag) as Folder;
  folderTreeCache.set(cacheKey, root);
  folderFlatCache.set(cacheKey, buildFlatMap(root));
  return root;
};

const getFolderById = (tagId: string, groupId?: string): Folder | undefined => {
  const cacheKey = normalizeTagGroupId(groupId) ?? CACHE_KEY_DEFAULT;
  return folderFlatCache.get(cacheKey)?.get(tagId);
};

const clearFolderTreeCache = (groupId?: string): void => {
  if (groupId !== undefined) {
    const cacheKey = normalizeTagGroupId(groupId) ?? CACHE_KEY_DEFAULT;
    folderTreeCache.delete(cacheKey);
    folderFlatCache.delete(cacheKey);
  } else {
    folderTreeCache.clear();
    folderFlatCache.clear();
  }
};

// 返回一个节点下的所有子节点和文件
const getResByFolder = async (params: GetResByFolderRequest): Promise<FolderListByPathResponse> => {
  const targetFolder = params.folder;
  await getFolderTree({ groupId: targetFolder.groupId });
  const folder = getFolderById(targetFolder.tagId, targetFolder.groupId);
  const folders = folder?.children ?? [];
  const filePage = params.filePage ?? 1;
  const filePageSize = params.filePageSize ?? 20;
  const tagId = targetFolder.tagId;

  let files: ResourceItem[] = [];
  let totalFiles = 0;

  const res = await ResourceServicesImpl.getUserResources({
    page: filePage,
    size: filePageSize,
    sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
    sortDir: RESOURCE_SORT_DIR.DESC,
    tagIds: [tagId],
    tagQueryLogicMode: 'AND',
  });

  files = res.list;
  totalFiles = res.total;

  return { folders, files, totalFiles };
};

const renameFolder = async (folder: Folder, newName: string): Promise<void> => {
  const newPathName = '/' + newName;
  const res = (await Axios.post('/resource/tag/changeTag', {
    targetTagId: folder.tagId,
    tagName: newPathName,
  })) as ApiResponse;
  checkResponse(res);
  clearFolderTreeCache(folder.groupId);
};

const deleteFolder = async (folder: Folder): Promise<void> => {
  const res = (await Axios.post('/resource/tag/removeTag', {
    targetTagId: folder.tagId,
  })) as ApiResponse;
  checkResponse(res);
  clearFolderTreeCache();
};

const createFolder = async (parentFolder: Folder, folderName: string): Promise<void> => {
  const newPathName = `/${folderName}`;
  const res = (await Axios.post('/resource/tag/addTag', {
    parentId: parentFolder.tagId,
    tagName: newPathName,
  })) as ApiResponse;
  checkResponse(res);
  clearFolderTreeCache();
};

const moveFolderToFolder = async (folder: Folder, newParentFolder: Folder): Promise<void> => {
  // 遍历 newParentFolder 的父链，防止循环移动
  let current: Folder | undefined = newParentFolder;
  while (current) {
    if (current.tagId === folder.tagId) {
      throw new Error('不能将文件夹移动到自身或其子目录下');
    }
    // folder.groupId 可选，不一定有，所以调用 getFolderById 时带 groupId
    if (!current.parentId) break;
    current = getFolderById(current.parentId, current.groupId);
  }
  const res = (await Axios.post('/resource/tag/moveTag', {
    targetTagId: folder.tagId,
    newParentId: newParentFolder.tagId,
  })) as ApiResponse;
  checkResponse(res);
  clearFolderTreeCache();
};

const moveResourceToFolder = async (folder: Folder, resource: ResourceItem): Promise<void> => {
  const currentTags = resource.currentTags ?? {};
  // 过滤出非文件夹标签，保留
  const nonFolderTagIds = Object.entries(currentTags)
    .filter(([, tagName]) => !tagName.startsWith('/'))
    .map(([tagId]) => tagId);
  // 构造新的标签列表
  const newTagIds = [...nonFolderTagIds, folder.tagId];

  await ResourceServicesImpl.updateResourceTags({
    resourceId: resource.resourceId,
    tagIds: newTagIds,
  });
  clearFolderTreeCache();
};

export const FolderServicesImpl: IFolderService = {
  getFolderTree,
  getFolderById,
  getResByFolder,
  renameFolder,
  deleteFolder,
  createFolder,
  moveFolderToFolder,
  moveResourceToFolder,
};
