import { useMemo } from 'react';
import { ROLE_REVERSE_MAP } from '@/types/group';
import { canEditSelectedMembers, canEditSelectedMembersForQuota } from '../PermissionConfig';
import type { EditableRole, EditableRoleForQuota } from '../PermissionConfig';

interface UseMemberEditGuardOptions {
  /** 是否校验选中成员中是否包含 OWNER（删除、修改权限需要，分配配额不需要） */
  checkOwner?: boolean;
  /** 使用配额规则：editableRoles 为 editableRolesForQuota，允许组长修改自己 */
  forQuota?: boolean;
}

/**
 * 成员编辑类 Modal 的通用校验逻辑
 * @returns memberContainsOwner, canEdit, confirmDisabled
 */
export function useMemberEditGuard(
  members: { role?: number }[],
  editableRoles: readonly (EditableRole | EditableRoleForQuota)[],
  options: UseMemberEditGuardOptions = {}
): { memberContainsOwner: boolean; canEdit: boolean; confirmDisabled: boolean } {
  const { checkOwner = true, forQuota = false } = options;

  return useMemo(() => {
    const memberContainsOwner = members.some((m) => ROLE_REVERSE_MAP[m.role ?? 0] === 'OWNER');
    const canEdit = forQuota
      ? canEditSelectedMembersForQuota(members, editableRoles as readonly EditableRoleForQuota[])
      : canEditSelectedMembers(members, editableRoles as readonly EditableRole[]);
    const confirmDisabled = checkOwner ? memberContainsOwner || !canEdit : !canEdit;
    return { memberContainsOwner, canEdit, confirmDisabled };
  }, [members, editableRoles, checkOwner, forQuota]);
}
