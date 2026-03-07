import type { GroupMember } from '@/types/group';
import type { PermissionConfig } from '../PermissionConfig';

export interface InviteUserModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  inviteCode?: string;
}

export interface EditPermissionModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  groupId: string | number;
  memberIds: number[];
  members: GroupMember[];
  permissionConfig: Pick<PermissionConfig, 'editableRoles' | 'canModifyPermission'>;
}

export interface DeleteMemberModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  memberIds: number[];
  members: GroupMember[];
  groupId: string | number;
  permissionConfig: Pick<PermissionConfig, 'editableRoles'>;
}

export interface AssignQuotaModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  groupId: string | number;
  memberIds: number[];
  members: GroupMember[];
  permissionConfig: Pick<PermissionConfig, 'editableRolesForQuota'>;
}
