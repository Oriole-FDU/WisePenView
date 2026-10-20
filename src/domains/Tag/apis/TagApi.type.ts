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
  tagDesc: string | null;
  tagIcon: string | null;
  tagColor: string | null;
  tagMetaInfo: string | null;
  tagCreator: string | null;
  creatorInfo: UserDisplayBaseApiResponse | null;
  isPath: boolean;
  taggedResourceAclGrantScope: TagAccessControlScopeApiValue | null;
  taggedResourceAclGrantSpecifiedUsers: string[];
  taggedResourceGrantedActionsMask: number | null;
  tagMountPermissionScope: TagAccessControlScopeApiValue | null;
  tagMountSpecifiedUsers: string[];
  grantedActions: TagResourceActionApiKey[];
  parentId: string;
  children: TagTreeApiResponse[];
}

export type GetTagTreeApiResponse = TagTreeApiResponse[];
