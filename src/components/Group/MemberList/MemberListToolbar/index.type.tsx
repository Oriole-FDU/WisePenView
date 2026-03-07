/** Toolbar 依赖 PermissionConfig 的动作权限 */
export interface MemberListToolbarProps {
  isEditMode: boolean;
  total: number;
  permissionConfig: {
    canEnterEditMode: boolean;
    canModifyPermission: boolean;
    canAssignQuota: boolean;
    canRemoveMember: boolean;
  };
  selectedCount: number;
  onModifyPermission: () => void;
  onAssignQuota: () => void;
  onDelete: () => void;
  onToggleEditMode: () => void;
  onInviteUser: () => void;
}
