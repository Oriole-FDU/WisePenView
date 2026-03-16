export interface NewFolderModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  /** 父路径，如 '/' 或 '/a/b' */
  parentPath: string;
}
