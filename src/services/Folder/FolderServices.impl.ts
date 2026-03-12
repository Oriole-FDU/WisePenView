import type { ApiResponse } from '@/types/api';
import type { ResourceItem } from '@/types/resource';
import type { Folder, FolderListByPathResponse } from '@/types/folder';
import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import { filterPathTagsOnly, findNodeByPath } from '@/utils/tagTree';
import { TagServicesImpl } from '@/services/Tag/TagServices.impl';
import { ResourceServicesImpl } from '@/services/Resource/ResourceServices.impl';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/services/Resource/index.type';
import type { IFolderService, GetResByFolderRequest } from './index.type';

const getFolderTree = async (): Promise<Folder[]> => {
  const res = (await Axios.get('/resource/tag/getTagTree')) as ApiResponse<Folder[]>;
  checkResponse(res);
  const raw = res.data ?? [];
  return filterPathTagsOnly(raw);
};

const getFolder = async (path: string): Promise<Folder | null> => {
  const folderTree = await getFolderTree();
  return findNodeByPath(folderTree, path);
};

const getResByFolder = async (params: GetResByFolderRequest): Promise<FolderListByPathResponse> => {
  const folderTree = await getFolderTree();
  const node = findNodeByPath(folderTree, params.path);
  const folders = node?.children ?? [];
  const filePage = params.filePage ?? 1;
  const filePageSize = params.filePageSize ?? 20;
  const tagId = node?.tagId;

  let files: ResourceItem[] = [];
  let totalFiles = 0;

  if (tagId != null) {
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
  }

  return { folders, files, totalFiles };
};

const renameFolder = async (folder: Folder, newName: string): Promise<void> => {
  const tagName = (folder.tagName ?? '').trim();
  if (!tagName || tagName === '/') return;
  const parts = tagName.split('/').filter(Boolean);
  parts[parts.length - 1] = newName.trim();
  const newPath = '/' + parts.join('/');
  await TagServicesImpl.changeTag({
    targetTagId: folder.tagId,
    tagName: newPath,
  });
};

const deleteFolder = async (folder: Folder): Promise<void> => {
  await TagServicesImpl.removeTag({ targetTagId: folder.tagId });
};

const createFolder = async (parentPath: string, folderName: string): Promise<void> => {
  const parentNode = await getFolder(parentPath);
  if (!parentNode?.tagId) {
    throw new Error('父路径不存在');
  }
  const newPath =
    parentPath === '/' || !parentPath ? `/${folderName}` : `${parentPath}/${folderName}`;
  await TagServicesImpl.addTag({
    parentId: parentNode.tagId,
    tagName: newPath,
  });
};

export const FolderServicesImpl: IFolderService = {
  getFolderTree,
  getFolder,
  getResByFolder,
  renameFolder,
  deleteFolder,
  createFolder,
};
