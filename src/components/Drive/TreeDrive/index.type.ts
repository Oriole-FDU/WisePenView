import type { ResourceItem } from '@/types/resource';
import type { Folder } from '@/types/folder';

/** TreeDrive 视图模式：文件夹树（path tag） / 标签树（全量 tag） */
export type TreeDriveMode = 'folder' | 'tag';

/** 表格行项：文件夹或文件 */
export type RowItem =
  | { key: string; _type: 'folder'; data: Folder }
  | { key: string; _type: 'file'; data: ResourceItem };

export interface TreeDriveProps {
  /** 视图模式：folder 为路径文件夹树，tag 为标签树。默认 folder */
  mode?: TreeDriveMode;
}

/**
 * 将当前路径下的 folders + folderFiles 转为 Table 的 dataSource
 */
export function buildTableDataSource(folders: Folder[], folderFiles: ResourceItem[]): RowItem[] {
  return [
    ...folders.map((f) => ({
      key: `folder-${f.tagId}`,
      _type: 'folder' as const,
      data: f,
    })),
    ...folderFiles.map((f) => ({
      key: `file-${f.resourceId}`,
      _type: 'file' as const,
      data: f,
    })),
  ];
}
