import type { Group, GroupFileOrgLogic } from '@/domains/Group';
import type { TagResourceAction, TagResourceActionKey } from '@/domains/Tag';

export interface ListGroupApiRequest {
  groupRoleFilter: 'JOINED' | 'MANAGED';
  page: number;
  size: number;
}

export interface ListGroupApiResponse {
  total: number;
  list: Group[];
}

export interface GetGroupInfoApiRequest {
  groupId: string;
}

export type GetGroupInfoApiResponse = Group;
export type GetGroupBaseInfoApiResponse = Group;
export type AddGroupApiRequest = {
  groupName: string;
  groupType: number;
  groupDesc: string;
  groupCoverUrl?: string;
};
export type AddGroupApiResponse = string | number;
export type ChangeGroupApiRequest = {
  groupId: string;
  groupName: string;
  groupDesc: string;
  groupCoverUrl: string;
  groupType: number;
};
export interface RemoveGroupApiRequest {
  groupId: string;
}

export interface GetGroupConfigApiRequest {
  groupId: string;
}

export interface GetGroupConfigApiResponse {
  groupId?: string | number;
  fileOrgLogic?: GroupFileOrgLogic | string;
  defaultMemberActions?: Array<TagResourceAction | string | number>;
}

export interface ChangeGroupConfigApiRequest {
  groupId: string;
  fileOrgLogic: GroupFileOrgLogic;
  defaultMemberActions?: TagResourceActionKey[];
}

export interface JoinGroupApiRequest {
  inviteCode: string;
}

export interface GroupMemberBaseInfo {
  nickname: string;
  realName: string | null;
  avatar: string | null;
  identityType: number;
}

export interface GroupMemberRawResponse {
  role: number;
  joinTime: string;
  tokenLimit: number;
  tokenUsed: number;
  groupId: string;
  memberId: string;
  memberInfo: GroupMemberBaseInfo;
}

export interface FetchGroupMembersApiResponse {
  total: string;
  page: number;
  size: number;
  totalPage: number;
  list: GroupMemberRawResponse[];
}

export interface ListMemberApiRequest {
  groupId: string | number;
  page: number;
  size: number;
}

export interface GroupRoleApiResponse {
  role: number;
}

export interface QuitGroupApiRequest {
  groupId: string;
}

export interface ChangeRoleApiRequest {
  groupId: string;
  targetUserIds: string[];
  role: number;
}

export interface KickMemberApiRequest {
  groupId: string;
  targetUserIds: string[];
}

export interface GetGroupTokenApiRequest {
  groupId: string | number;
}

export interface ChangeTokenLimitApiRequest {
  groupId: string;
  targetUserIds: string[];
  newTokenLimit: number;
}

export interface GetAllMyGroupTokenInfoApiRequest {
  page: number;
  size: number;
}
