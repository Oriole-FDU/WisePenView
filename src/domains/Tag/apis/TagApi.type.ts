import type { ResourceAction } from '@/domains/_shared/access';
import type { UserDisplayBaseApiResponse } from '@/domains/User/apis/UserApi.type';

type TagAccessControlScopeApiValue = 'ALL' | 'ONLY_ADMIN' | 'WHITELIST' | 'BLACKLIST';

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
  visibilityMode?: string;
  taggedResourceAclGrantScope?: TagAccessControlScopeApiValue;
  taggedResourceAclGrantSpecifiedUsers?: string[];
  tagMountPermissionScope?: TagAccessControlScopeApiValue;
  tagMountSpecifiedUsers?: string[];
  grantedActions?: ResourceAction[];
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
  groupId?: string;
  tagDesc?: string;
  tagIcon?: string;
  tagColor?: string;
  tagMetaInfo?: string;
  tagCreator?: string;
  creatorInfo?: UserDisplayBaseApiResponse | null;
  isPath?: boolean;
  visibilityMode?: string;
  taggedResourceAclGrantScope?: TagAccessControlScopeApiValue;
  taggedResourceAclGrantSpecifiedUsers?: string[];
  tagMountPermissionScope?: TagAccessControlScopeApiValue;
  tagMountSpecifiedUsers?: string[];
  grantedActions: ResourceAction[];
  parentId?: string;
  children?: TagTreeApiResponse[];
}

export type GetTagTreeApiResponse = TagTreeApiResponse[];
