import type { TagPolicyModalMode } from './_common/tagPermissionModalModel';

export interface TagPermissionModalProps {
  isOpen: boolean;
  groupId?: string;
  initialTagId?: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export type TagMountPermissionModalProps = TagPermissionModalProps;

export interface TagPolicyModalBaseProps extends TagPermissionModalProps {
  mode: TagPolicyModalMode;
}
