import type { ResourceItem } from '@/types/resource';
import type { TagTreeNode } from '@/services/Tag/index.type';

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
  folder: TagTreeNode | null;
}

export interface DeleteFolderModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  folder: TagTreeNode | null;
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
