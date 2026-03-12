import type { Folder, FolderListByPathResponse } from '@/types/folder';
import type { IFolderService, GetResByFolderRequest } from '@/services/Folder';
import mockdata from '@/mocks/Tag/mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const tagTree = mockdata.tagTree as Folder[];
const listByPath = mockdata.listByPath as FolderListByPathResponse;

const getFolderTree = async (): Promise<Folder[]> => {
  await delay(200);
  return tagTree;
};

const getFolder = async (path: string): Promise<Folder | null> => {
  await delay(100);
  const find = (nodes: Folder[], p: string): Folder | null => {
    for (const n of nodes) {
      if (n.tagName === p) return n;
      if (n.children?.length) {
        const found = find(n.children, p);
        if (found) return found;
      }
    }
    return null;
  };
  return find(tagTree, path);
};

const getResByFolder = async (
  _params: GetResByFolderRequest
): Promise<FolderListByPathResponse> => {
  await delay(200);
  return listByPath;
};

const renameFolder = async (_folder: Folder, _newName: string): Promise<void> => {
  await delay(150);
};

const deleteFolder = async (_folder: Folder): Promise<void> => {
  await delay(150);
};

const createFolder = async (_parentPath: string, _folderName: string): Promise<void> => {
  await delay(150);
};

export const FolderServicesMock: IFolderService = {
  getFolderTree,
  getFolder,
  getResByFolder,
  renameFolder,
  deleteFolder,
  createFolder,
};
