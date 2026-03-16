import type { RefObject } from 'react';
import type { ResourceItem } from '@/types/resource';
import type { Folder } from '@/types/folder';
import type { RowItem, TreeDriveMode } from '../index.type';

/** HTML5 拖拽 dataTransfer 类型：文件 */
export const DRAG_TYPE_FILE = 'application/x-wisepen-folder-file';
/** HTML5 拖拽 dataTransfer 类型：文件夹 */
export const DRAG_TYPE_FOLDER = 'application/x-wisepen-folder-folder';

/** 创建「行点击」回调：防拖拽误触 + 按 folder/file 分支调用对应回调 */
export function createOnRowClick(options: {
  isDraggingRef: RefObject<boolean>;
  onFolderClick: (folder: Folder) => void;
  onFileClick: (file: ResourceItem) => void;
}): (record: RowItem) => void {
  const { isDraggingRef, onFolderClick, onFileClick } = options;
  return (record: RowItem) => {
    if (isDraggingRef.current) return;
    if (record._type === 'folder') {
      onFolderClick(record.data);
    } else {
      onFileClick(record.data);
    }
  };
}

export interface TreeDriveRowConfigOptions {
  /** 视图模式：tag 模式下禁用拖拽 */
  mode: TreeDriveMode;
  /** 拖拽中标记，用于点击时忽略（避免拖拽误触点击） */
  isDraggingRef: RefObject<boolean>;
  styles: {
    droppableOver: string;
  };
  /** 行点击（进入文件夹 / 打开文件） */
  onRowClick: (record: RowItem) => void;
  /** 文件拖放到文件夹 */
  onDropFile: (file: ResourceItem, targetFolder: Folder) => void;
  /** 文件夹拖放到文件夹 */
  onDropFolder: (folder: Folder, targetFolder: Folder) => void;
}

/**
 * 返回 Table onRow 所需的 getRowProps：(record) => row props
 * 包含行点击、文件/文件夹拖拽与放置
 */
export function getTreeDriveRowProps(
  options: TreeDriveRowConfigOptions
): (record: RowItem) => React.HTMLAttributes<HTMLTableRowElement> {
  const { mode, isDraggingRef, styles, onRowClick, onDropFile, onDropFolder } = options;

  return (record: RowItem): React.HTMLAttributes<HTMLTableRowElement> => {
    const base = {
      onClick: () => onRowClick(record),
      style: { cursor: 'pointer' as const },
    };

    if (mode === 'tag') {
      return base;
    }

    if (record._type === 'file') {
      return {
        ...base,
        draggable: true,
        onDragStart: (e: React.DragEvent) => {
          isDraggingRef.current = true;
          e.dataTransfer.setData(DRAG_TYPE_FILE, JSON.stringify(record.data));
          e.dataTransfer.effectAllowed = 'move';
        },
        onDragEnd: () => {
          isDraggingRef.current = false;
        },
      };
    }

    if (record._type === 'folder') {
      return {
        ...base,
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          e.currentTarget.classList.add(styles.droppableOver);
        },
        onDragLeave: (e: React.DragEvent) => {
          e.currentTarget.classList.remove(styles.droppableOver);
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          e.currentTarget.classList.remove(styles.droppableOver);
          const fileRaw = e.dataTransfer.getData(DRAG_TYPE_FILE);
          const folderRaw = e.dataTransfer.getData(DRAG_TYPE_FOLDER);
          if (fileRaw) {
            try {
              const file = JSON.parse(fileRaw) as ResourceItem;
              onDropFile(file, record.data);
            } catch {
              // ignore
            }
          } else if (folderRaw) {
            try {
              const folder = JSON.parse(folderRaw) as Folder;
              const target = record.data;
              if (folder.tagId === target.tagId) return;
              if ((target.tagName ?? '').startsWith((folder.tagName ?? '') + '/')) return;
              onDropFolder(folder, target);
            } catch {
              // ignore
            }
          }
        },
        draggable: true,
        onDragStart: (e: React.DragEvent) => {
          isDraggingRef.current = true;
          e.dataTransfer.setData(DRAG_TYPE_FOLDER, JSON.stringify(record.data));
          e.dataTransfer.effectAllowed = 'move';
        },
        onDragEnd: () => {
          isDraggingRef.current = false;
        },
      };
    }

    return base;
  };
}
