import type { Nullable, PageApiRequest, PageR } from '@/apis/api.type';
import type { TagResourceActionKey } from '@/domains/Tag';
import type {
  UserDisplayBaseApiResponse,
  UserIdentityTypeApiValue,
} from '@/domains/User/apis/UserApi.type';

type GroupFileOrgLogicApiValue = 'FOLDER' | 'TAG';
type GroupTypeApiValue = 'NORMAL_GROUP' | 'ADVANCED_GROUP' | 'MARKET_GROUP';
type GroupTypeApiRequestValue = 'NORMAL_GROUP' | 'ADVANCED_GROUP' | 'MARKET_GROUP';
type GroupRoleApiValue = 'OWNER' | 'ADMIN' | 'MEMBER' | 'NOT_MEMBER';
type GroupResourceActionApiValue = TagResourceActionKey;
type GroupResourceActionApiList = GroupResourceActionApiValue[];

export interface ListGroupApiRequest extends PageApiRequest {
  groupRoleFilter: 'ALL' | 'JOINED' | 'MANAGED';
  groupType?: GroupTypeApiRequestValue;
}

export interface GroupApiResponse {
  groupId: string;
  groupName: string;
  groupDesc: Nullable<string>;
  groupCoverUrl: Nullable<string>;
  groupMetaInfo: Nullable<string>;
  groupType: GroupTypeApiValue;
  ownerId: string;
  ownerInfo: Nullable<UserDisplayBaseApiResponse>;
  memberCount: number;
  createTime: number;
}

export type ListGroupApiResponse = PageR<GroupApiResponse>;

export interface GetGroupInfoApiRequest {
  groupId: string;
}

export interface GroupDetailApiResponse extends GroupApiResponse {
  inviteCode: string;
  tokenUsed: number;
  tokenBalance: number;
}

export type GetGroupInfoApiResponse = GroupDetailApiResponse;
export type GetGroupBaseInfoApiRequest = GetGroupInfoApiRequest;
export type GetGroupBaseInfoApiResponse = GroupApiResponse;
export type AddGroupApiRequest = {
  groupName: string;
  groupType: GroupTypeApiRequestValue;
  groupDesc: string;
  groupCoverUrl?: string;
  groupMetaInfo?: string;
};
export type AddGroupApiResponse = string;
export type ChangeGroupApiRequest = {
  groupId: string;
  groupName: string;
  groupDesc: string;
  groupCoverUrl: string;
  groupMetaInfo?: string;
  groupType: GroupTypeApiRequestValue;
};
export interface RemoveGroupApiRequest {
  groupId: string;
}

export interface GetGroupConfigApiRequest {
  groupId: string;
}

export interface GetGroupConfigApiResponse {
  groupId: string;
  fileOrgLogic: GroupFileOrgLogicApiValue;
  defaultMemberActions: GroupResourceActionApiList;
}

export interface ChangeGroupConfigApiRequest {
  groupId: string;
  fileOrgLogic: GroupFileOrgLogicApiValue;
  defaultMemberActions?: TagResourceActionKey[];
}

export interface JoinGroupApiRequest {
  inviteCode: string;
}

export interface GroupMemberBaseInfoApiResponse {
  nickname: string;
  realName: Nullable<string>;
  avatar: Nullable<string>;
  identityType: UserIdentityTypeApiValue;
  campusNo: Nullable<string>;
  email: Nullable<string>;
  mobile: Nullable<string>;
}

export interface GroupMemberApiResponse {
  role: GroupRoleApiValue;
  joinTime: number;
  tokenLimit: number;
  tokenUsed: number;
  groupId: string;
  memberId: string;
  memberInfo: Nullable<GroupMemberBaseInfoApiResponse>;
}

export type FetchGroupMembersApiResponse = PageR<GroupMemberApiResponse>;

export interface ListMemberApiRequest extends PageApiRequest {
  groupId: string;
}

export type GroupRoleApiResponse = GroupRoleApiValue;

export interface QuitGroupApiRequest {
  groupId: string;
}

export interface ChangeRoleApiRequest {
  groupId: string;
  targetUserIds: string[];
  role: GroupRoleApiValue;
}

export interface KickMemberApiRequest {
  groupId: string;
  targetUserIds: string[];
}

export interface GetMyGroupMemberInfoApiRequest {
  groupId: string;
}

export interface GetMyGroupMemberInfoApiResponse {
  role: GroupRoleApiValue;
  joinTime: number;
  tokenUsed: number;
  tokenLimit: number;
  groupId: string;
  memberId: string;
  memberInfo: Nullable<GroupMemberBaseInfoApiResponse>;
}

export interface ChangeTokenLimitApiRequest {
  groupId: string;
  targetUserIds: string[];
  newTokenLimit: number;
}

export type GetAllMyGroupTokenInfoApiRequest = PageApiRequest;

export interface GroupTokenInfoApiResponseItem {
  groupId: string;
  groupDisplayBase: Nullable<{
    groupName: string;
    groupType: GroupTypeApiValue;
  }>;
  tokenLimit: number;
  tokenUsed: number;
}

export type GetAllMyGroupTokenInfoApiResponse = PageR<GroupTokenInfoApiResponseItem>;
