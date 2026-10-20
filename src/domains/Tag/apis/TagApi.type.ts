import type { Nullable } from '@/apis/api.type';
import type { ResourceActionApiKey } from '@/domains/Resource/apis/ResourceApi.type';
import type { UserDisplayBaseApiResponse } from '@/domains/User/apis/UserApi.type';

type TagAccessControlScopeApiValue = 'ALL' | 'ONLY_ADMIN' | 'WHITELIST' | 'BLACKLIST';
type TagResourceActionApiKey = ResourceActionApiKey;

export interface AddTagApiRequest {
  groupId?: string;
  parentId?: string;
  tagName: string;
  tagDesc?: string;
  tagIcon?: string;
  tagColor?: string;
  tagMetaInfo?: string;
  tagCreator?: string;
  isPath?: boolean;
  taggedResourceAclGrantScope?: TagAccessControlScopeApiValue;
  taggedResourceAclGrantSpecifiedUsers?: string[];
  tagMountPermissionScope?: TagAccessControlScopeApiValue;
  tagMountSpecifiedUsers?: string[];
  grantedActions?: TagResourceActionApiKey[];
}

export interface ChangeTagApiRequest extends Omit<AddTagApiRequest, 'parentId' | 'tagName'> {
  tagName?: string;
  targetTagId: string;
}

export interface RemoveTagsApiRequest {
  groupId?: string;
  targetTagIds: string[];
}

export interface MoveTagsApiRequest extends RemoveTagsApiRequest {
  newParentId?: string;
}

export interface GetTagTreeApiRequest {
  groupId?: string;
}

export interface TagTreeApiResponse {
  tagId: string;
  tagName: string;
  groupId: string;
  tagDesc: Nullable<string>;
  tagIcon: Nullable<string>;
  tagColor: Nullable<string>;
  tagMetaInfo: Nullable<string>;
  tagCreator: Nullable<string>;
  creatorInfo: Nullable<UserDisplayBaseApiResponse>;
  isPath: boolean;
  taggedResourceAclGrantScope: Nullable<TagAccessControlScopeApiValue>;
  taggedResourceAclGrantSpecifiedUsers: string[];
  taggedResourceGrantedActionsMask: Nullable<number>;
  tagMountPermissionScope: Nullable<TagAccessControlScopeApiValue>;
  tagMountSpecifiedUsers: string[];
  grantedActions: TagResourceActionApiKey[];
  parentId: string;
  children: TagTreeApiResponse[];
}

export type GetTagTreeApiResponse = TagTreeApiResponse[];
