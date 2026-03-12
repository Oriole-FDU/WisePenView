import type { Folder } from '@/types/folder';
import type { ResourceItem } from '@/types/resource';

export interface NewFolderModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  /** 父路径，如 '/' 或 '/a/b' */
  parentPath: string;
}

export interface RenameFolderModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  folder: Folder | null;
}

export interface DeleteFolderModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  folder: Folder | null;
}

export interface RenameFileModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  file: ResourceItem | null;
}

export interface DeleteFileModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  file: ResourceItem | null;
}

export interface EditTagModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  file: ResourceItem | null;
  /** 小组 ID，不传则使用个人标签树 */
  groupId?: string;
}

/** 移动到文件夹的目标：文件或文件夹 */
export type MoveToFolderTarget =
  | { type: 'file'; data: ResourceItem }
  | { type: 'folder'; data: Folder };

export interface MoveToFolderModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  target: MoveToFolderTarget | null;
}
