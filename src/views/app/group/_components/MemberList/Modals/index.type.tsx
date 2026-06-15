import type { GroupMember } from '@/domains/Group';
import type { GroupDisplayConfig } from '../../GroupDisplayConfig';

export interface InviteUserModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  inviteCode?: string;
}

export interface EditPermissionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  groupId: string;
  memberIds: string[];
  members: GroupMember[];
  groupDisplayConfig: Pick<GroupDisplayConfig, 'editableRoles' | 'canModifyPermission'>;
}

export interface DeleteMemberModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  memberIds: string[];
  members: GroupMember[];
  groupId: string;
  groupDisplayConfig: Pick<GroupDisplayConfig, 'editableRoles'>;
}

export interface AssignQuotaModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  groupId: string;
  memberIds: string[];
  members: GroupMember[];
  groupDisplayConfig: Pick<GroupDisplayConfig, 'editableRolesForQuota'>;
}
