import { mapTagToFolderNode } from '@/domains/Drive/mapper/DriveServices.map';
import type { GroupMember } from '@/domains/Group';
import {
  ACCESS_CONTROL_SCOPE,
  normalizeResourceActions,
  type AccessControlScope,
  type TagResourceAction,
  type TagTreeNode,
} from '@/domains/Tag';
import type { TFunction } from 'i18next';
import {
  resolveDriveScope,
  toDriveSelectionItem,
  type DriveSelectionItem,
} from '../../common/driveComponentModel';
import type { Selection } from '@heroui/react';

export type TagPolicyModalMode = 'access' | 'mount';
export type PersonnelPolicyTarget = 'resourceGrant' | 'tagMount';

export type TagPermissionFormValues = {
  taggedResourceAclGrantScope: AccessControlScope;
  taggedResourceAclGrantSpecifiedUsers: string[];
  tagMountPermissionScope: AccessControlScope;
  tagMountSpecifiedUsers: string[];
  grantedActions: TagResourceAction[];
};

export interface PersonnelPolicyConfig {
  target: PersonnelPolicyTarget;
  title: string;
  scope: AccessControlScope;
  specifiedUsers: string[];
  searchValue: string;
}

export interface MemberOption {
  userId: string;
  name: string;
  description: string;
  avatar?: string;
}

export const DEFAULT_FORM_VALUES: TagPermissionFormValues = {
  taggedResourceAclGrantScope: ACCESS_CONTROL_SCOPE.ALL,
  taggedResourceAclGrantSpecifiedUsers: [],
  tagMountPermissionScope: ACCESS_CONTROL_SCOPE.ALL,
  tagMountSpecifiedUsers: [],
  grantedActions: [],
};

export const GROUP_MEMBER_PAGE_SIZE = 100;
export const MAX_GROUP_MEMBER_PAGE_COUNT = 50;
export const PERSONNEL_SCOPE_OPTIONS = [
  { scope: ACCESS_CONTROL_SCOPE.ALL, labelKey: 'permission.tag.scope.all' },
  { scope: ACCESS_CONTROL_SCOPE.ONLY_ADMIN, labelKey: 'permission.tag.scope.onlyAdmin' },
  { scope: ACCESS_CONTROL_SCOPE.BLACKLIST, labelKey: 'permission.tag.scope.blacklist' },
  { scope: ACCESS_CONTROL_SCOPE.WHITELIST, labelKey: 'permission.tag.scope.whitelist' },
] as const;

export const isSpecifiedUserScope = (scope: AccessControlScope): boolean =>
  scope === ACCESS_CONTROL_SCOPE.WHITELIST || scope === ACCESS_CONTROL_SCOPE.BLACKLIST;

export const normalizeSpecifiedUsersByScope = (
  scope: AccessControlScope,
  userIds: string[]
): string[] => (isSpecifiedUserScope(scope) ? userIds : []);

export const getDisplayInitial = (name: string): string => name.trim().charAt(0).toUpperCase() || '?';

export const getMemberDisplayName = (
  member: GroupMember,
  t: TFunction<'resource'>
): string =>
  member.realname?.trim() ||
  member.nickname?.trim() ||
  t('permission.tag.memberFallback', { userId: member.userId });

export const getMemberAvatar = (member: GroupMember): string | undefined => {
  const avatar = member.avatar?.trim();
  return avatar || undefined;
};

export const buildMemberOptions = (
  members: GroupMember[],
  selectedUserIds: string[],
  t: TFunction<'resource'>
): MemberOption[] => {
  const allGroupMemberIds = new Set(members.map((member) => member.userId));
  const memberOptions = members
    .filter((member) => member.role === 'MEMBER')
    .map((member) => ({
      userId: member.userId,
      name: getMemberDisplayName(member, t),
      description: t('permission.tag.memberRole'),
      avatar: getMemberAvatar(member),
    }));
  const existingIds = new Set(memberOptions.map((member) => member.userId));
  const missingSelectedOptions = selectedUserIds
    .filter((userId) => userId && !existingIds.has(userId) && !allGroupMemberIds.has(userId))
    .map((userId) => ({
      userId,
      name: t('permission.tag.memberFallback', { userId }),
      description: t('permission.tag.selected'),
    }));
  return [...memberOptions, ...missingSelectedOptions];
};

export const selectionToUserIds = (
  keys: Selection,
  memberOptions: MemberOption[]
): string[] => {
  if (keys === 'all') return memberOptions.map((member) => member.userId);
  return [...keys].map((key) => String(key));
};

export const mergeVisibleSelection = (
  keys: Selection,
  visibleMemberOptions: MemberOption[],
  currentUserIds: string[]
): string[] => {
  const visibleMemberIds = new Set(visibleMemberOptions.map((member) => member.userId));
  const hiddenSelectedUserIds = currentUserIds.filter((userId) => !visibleMemberIds.has(userId));
  return Array.from(
    new Set([...hiddenSelectedUserIds, ...selectionToUserIds(keys, visibleMemberOptions)])
  );
};

export const filterMemberOptions = (
  members: MemberOption[],
  keyword: string
): MemberOption[] => {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return members;
  return members.filter((member) => {
    const searchableText = `${member.name} ${member.description} ${member.userId}`.toLowerCase();
    return searchableText.includes(normalizedKeyword);
  });
};

export const normalizeFormForMode = (
  values: TagPermissionFormValues,
  mode: TagPolicyModalMode
): TagPermissionFormValues => {
  if (mode === 'access') {
    const accessScope = values.taggedResourceAclGrantScope;
    return {
      ...values,
      taggedResourceAclGrantSpecifiedUsers: normalizeSpecifiedUsersByScope(
        accessScope,
        values.taggedResourceAclGrantSpecifiedUsers
      ),
    };
  }
  const mountScope = values.tagMountPermissionScope;
  return {
    ...values,
    tagMountSpecifiedUsers: normalizeSpecifiedUsersByScope(
      mountScope,
      values.tagMountSpecifiedUsers
    ),
  };
};

export const buildSelectionFromTag = (
  tag: TagTreeNode,
  groupId?: string
): DriveSelectionItem => {
  const scope = resolveDriveScope(groupId ? { type: 'group', groupId } : undefined).scope;
  const node = mapTagToFolderNode(tag, null, scope);
  const selection = toDriveSelectionItem(node);
  if (selection) return selection;
  return {
    nodeId: node.id,
    kind: 'folder',
    label: node.name,
    parentNodeId: node.parentId,
    scope,
    rootId: scope.rootId,
    groupId: scope.type === 'group' ? scope.groupId : undefined,
    tagId: tag.tagId,
  };
};

export const buildFormFromTag = (tag: TagTreeNode): TagPermissionFormValues => ({
  taggedResourceAclGrantScope: tag.taggedResourceAclGrantScope ?? ACCESS_CONTROL_SCOPE.ALL,
  taggedResourceAclGrantSpecifiedUsers: tag.taggedResourceAclGrantSpecifiedUsers ?? [],
  tagMountPermissionScope: tag.tagMountPermissionScope ?? ACCESS_CONTROL_SCOPE.ALL,
  tagMountSpecifiedUsers: tag.tagMountSpecifiedUsers ?? [],
  grantedActions: normalizeResourceActions(tag.grantedActions),
});
