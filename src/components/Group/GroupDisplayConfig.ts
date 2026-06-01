// 小组模块展示与操作能力由 {GroupType} x {UserRole} 查表决定（详情 Tab、成员列表等共用）
// 设计：OWNER 全部权限，ADMIN 可修改 MEMBER 的配额、可踢出 MEMBER，MEMBER 无编辑权限
// 注意：组长(OWNER)的权限修改和删除不被允许；配额单独用 editableRolesForQuota，组长可修改自己的配额

import type { ROLE } from '@/domains/Group';
import { GROUP_TYPE } from '@/domains/Group';
import type { EnumKey } from '@/utils/enum';

export type EditableRole = Exclude<EnumKey<typeof ROLE>, 'OWNER'>;

/** 配额分配时可编辑的角色（含 OWNER，组长可修改自己的配额） */
export type EditableRoleForQuota = EnumKey<typeof ROLE>;

export interface GroupDisplayConfig {
  groupType: number;
  userRole: string;
  /** 表格列：是否展示姓名 */
  showRealName: boolean;
  /** 表格列：是否展示配额 */
  showQuotas: boolean;
  /** 是否可进入编辑模式（展示「编辑用户」按钮） */
  canEnterEditMode: boolean;
  /** 当前用户可编辑的角色列表（权限修改、删除），OWNER 永远不可被编辑 */
  editableRoles: readonly EditableRole[];
  /** 当前用户可分配配额的角色列表（组长可含自己） */
  editableRolesForQuota: readonly EditableRoleForQuota[];
  /** 是否可修改权限/可提升为管理员（展示「修改权限」按钮及 ADMIN 选项，仅 OWNER） */
  canModifyPermission: boolean;
  /** 是否可分配配额（OWNER、ADMIN） */
  canAssignQuota: boolean;
  /** 是否可删除/踢出成员（OWNER 可踢 ADMIN/MEMBER，ADMIN 仅可踢 MEMBER） */
  canRemoveMember: boolean;
  /** 高级组且当前用户为组长时，小组详情展示 token 明细与 token 划拨 Tab */
  showWalletTabs: boolean;
  /** 是否可创建标签（OWNER、ADMIN） */
  canCreateTag: boolean;
  /** 是否可管理标签权限（OWNER、ADMIN） */
  canManageTag: boolean;
  /** 是否可邀请成员（OWNER、ADMIN） */
  canInviteMember: boolean;
}

const GroupDisplayConfigs: Record<number, Record<string, GroupDisplayConfig>> = {
  [GROUP_TYPE.NORMAL]: {
    MEMBER: {
      groupType: GROUP_TYPE.NORMAL,
      userRole: 'MEMBER',
      showRealName: false,
      showQuotas: false,
      canEnterEditMode: false,
      editableRoles: [],
      editableRolesForQuota: [],
      canModifyPermission: false,
      canAssignQuota: false,
      canRemoveMember: false,
      showWalletTabs: false,
      canCreateTag: false,
      canManageTag: false,
      canInviteMember: false,
    },
    ADMIN: {
      groupType: GROUP_TYPE.NORMAL,
      userRole: 'ADMIN',
      showRealName: false,
      showQuotas: false,
      canEnterEditMode: true,
      editableRoles: ['MEMBER'],
      editableRolesForQuota: ['MEMBER'],
      canModifyPermission: false,
      canAssignQuota: true,
      canRemoveMember: true,
      showWalletTabs: false,
      canCreateTag: true,
      canManageTag: true,
      canInviteMember: true,
    },
    OWNER: {
      groupType: GROUP_TYPE.NORMAL,
      userRole: 'OWNER',
      showRealName: false,
      showQuotas: false,
      canEnterEditMode: true,
      editableRoles: ['ADMIN', 'MEMBER'],
      editableRolesForQuota: ['OWNER', 'ADMIN', 'MEMBER'],
      canModifyPermission: true,
      canAssignQuota: true,
      canRemoveMember: true,
      showWalletTabs: false,
      canCreateTag: true,
      canManageTag: true,
      canInviteMember: true,
    },
  },
  [GROUP_TYPE.ADVANCED]: {
    MEMBER: {
      groupType: GROUP_TYPE.ADVANCED,
      userRole: 'MEMBER',
      showRealName: true,
      showQuotas: false,
      canEnterEditMode: false,
      editableRoles: [],
      editableRolesForQuota: [],
      canModifyPermission: false,
      canAssignQuota: false,
      canRemoveMember: false,
      showWalletTabs: false,
      canCreateTag: false,
      canManageTag: false,
      canInviteMember: false,
    },
    ADMIN: {
      groupType: GROUP_TYPE.ADVANCED,
      userRole: 'ADMIN',
      showRealName: true,
      showQuotas: true,
      canEnterEditMode: true,
      editableRoles: ['MEMBER'],
      editableRolesForQuota: ['MEMBER'],
      canModifyPermission: false,
      canAssignQuota: true,
      canRemoveMember: true,
      showWalletTabs: false,
      canCreateTag: true,
      canManageTag: true,
      canInviteMember: true,
    },
    OWNER: {
      groupType: GROUP_TYPE.ADVANCED,
      userRole: 'OWNER',
      showRealName: true,
      showQuotas: true,
      canEnterEditMode: true,
      editableRoles: ['ADMIN', 'MEMBER'],
      editableRolesForQuota: ['OWNER', 'ADMIN', 'MEMBER'],
      canModifyPermission: true,
      canAssignQuota: true,
      canRemoveMember: true,
      showWalletTabs: true,
      canCreateTag: true,
      canManageTag: true,
      canInviteMember: true,
    },
  },
  [GROUP_TYPE.PUBLIC]: {
    MEMBER: {
      groupType: GROUP_TYPE.PUBLIC,
      userRole: 'MEMBER',
      showRealName: true,
      showQuotas: false,
      canEnterEditMode: false,
      editableRoles: [],
      editableRolesForQuota: [],
      canModifyPermission: false,
      canAssignQuota: false,
      canRemoveMember: false,
      showWalletTabs: false,
      canCreateTag: false,
      canManageTag: false,
      canInviteMember: false,
    },
    ADMIN: {
      groupType: GROUP_TYPE.PUBLIC,
      userRole: 'ADMIN',
      showRealName: true,
      showQuotas: true,
      canEnterEditMode: true,
      editableRoles: ['MEMBER'],
      editableRolesForQuota: ['MEMBER'],
      canModifyPermission: false,
      canAssignQuota: true,
      canRemoveMember: true,
      showWalletTabs: false,
      canCreateTag: true,
      canManageTag: true,
      canInviteMember: true,
    },
    OWNER: {
      groupType: GROUP_TYPE.PUBLIC,
      userRole: 'OWNER',
      showRealName: true,
      showQuotas: true,
      canEnterEditMode: true,
      editableRoles: ['ADMIN', 'MEMBER'],
      editableRolesForQuota: ['OWNER', 'ADMIN', 'MEMBER'],
      canModifyPermission: true,
      canAssignQuota: true,
      canRemoveMember: true,
      showWalletTabs: false,
      canCreateTag: true,
      canManageTag: true,
      canInviteMember: true,
    },
  },
};

export const getGroupDisplayConfig = (groupType: number, userRole: string): GroupDisplayConfig => {
  const config = GroupDisplayConfigs[groupType]?.[userRole];

  return (
    config ?? {
      groupType,
      userRole,
      showRealName: false,
      showQuotas: false,
      canEnterEditMode: false,
      editableRoles: [],
      editableRolesForQuota: [],
      canModifyPermission: false,
      canAssignQuota: false,
      canRemoveMember: false,
      canCreateTag: false,
      canManageTag: false,
      showWalletTabs: false,
      canInviteMember: false,
    }
  );
};

/** 检查选中的成员是否均可被当前用户编辑（基于 editableRoles，OWNER 永远不可编辑，用于权限/删除） */
export const canEditSelectedMembers = (
  members: { role?: EnumKey<typeof ROLE> }[],
  editableRoles: readonly EditableRole[]
): boolean => {
  if (editableRoles.length === 0) return false;
  return members.every((m) => {
    if (m.role == null) return false;
    return m.role !== 'OWNER' && editableRoles.includes(m.role as EditableRole);
  });
};

/** 检查选中的成员是否均可被当前用户分配配额（基于 editableRolesForQuota，组长可含自己） */
export const canEditSelectedMembersForQuota = (
  members: { role?: EnumKey<typeof ROLE> }[],
  editableRolesForQuota: readonly EditableRoleForQuota[]
): boolean => {
  if (editableRolesForQuota.length === 0) return false;
  return members.every((m) => {
    if (m.role == null) return false;
    return editableRolesForQuota.includes(m.role as EditableRoleForQuota);
  });
};

/** 选中有不可编辑成员时的提示文案（权限/删除） */
export const UNAUTHORIZED_TARGET_MESSAGE = '您不能编辑组长/管理员的权限/配额。';

export default GroupDisplayConfigs;
