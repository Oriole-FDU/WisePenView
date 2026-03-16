import type { Folder } from '@/types/folder';
import type { ResourceItem } from '@/types/resource';

/** 移动到文件夹的目标：文件或文件夹 */
export type MoveToFolderTarget =
  | { type: 'file'; data: ResourceItem }
  | { type: 'folder'; data: Folder };
