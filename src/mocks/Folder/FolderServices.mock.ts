import type { Folder, FolderListByPathResponse } from '@/types/folder';
import type { IFolderService, GetResByFolderRequest } from '@/services/Folder';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface FolderMockData {
  folderTree: Folder[];
  listByPathByPath: Record<string, FolderListByPathResponse>;
}

const { folderTree, listByPathByPath } = mockdata as FolderMockData;

const emptyListByPath: FolderListByPathResponse = {
  folders: [],
  files: [],
  totalFiles: 0,
};

const getFolderTree = async (): Promise<Folder[]> => {
  await delay(200);
  return folderTree;
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
  return find(folderTree, path);
};

const getResByFolder = async (params: GetResByFolderRequest): Promise<FolderListByPathResponse> => {
  await delay(200);
  const path = params.path ?? '/';
  return listByPathByPath[path] ?? emptyListByPath;
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
