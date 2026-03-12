import type { Folder, FolderListByPathResponse } from '@/types/folder';

/** 按文件夹路径获取子文件夹与文件列表的请求参数 */
export interface GetResByFolderRequest {
  /** 路径，如 '/' 或 '/path/to/a' */
  path: string;
  /** 文件分页：页码，默认 1 */
  filePage?: number;
  /** 文件分页：每页条数，默认 20 */
  filePageSize?: number;
}

/** FolderService 接口：供依赖注入使用 */
export interface IFolderService {
  getFolderTree(): Promise<Folder[]>;
  getFolder(path: string): Promise<Folder | null>;
  getResByFolder(params: GetResByFolderRequest): Promise<FolderListByPathResponse>;
  renameFolder(folder: Folder, newName: string): Promise<void>;
  deleteFolder(folder: Folder): Promise<void>;
  createFolder(parentPath: string, folderName: string): Promise<void>;
}
