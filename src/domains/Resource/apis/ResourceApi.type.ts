import type { ResourceItem } from '@/domains/Resource';
import type { AccessControlScope, TagResourceActionKey } from '@/domains/Tag';

export interface ResourceListPageApiResponse {
  list: ResourceItem[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}

export interface ListResourceItemsApiRequest {
  page: number;
  size: number;
  sortBy: string;
  sortDir: string;
  resourceType?: string;
  tagIds?: string[];
  tagQueryLogicMode?: string;
  groupId?: string;
}

export interface RenameResourceApiRequest {
  resourceId: string;
  newName: string;
}

export interface ChangeResourceTagsApiRequest {
  resourceId: string;
  tagIds: string[];
  groupId?: string;
}

export interface RemoveResourcesApiRequest {
  resourceIds: string[];
}

export interface AddTagApiRequest {
  groupId?: string;
  parentId?: string;
  tagName: string;
  tagDesc?: string;
  tagIcon?: string;
  tagColor?: string;
  tagCreator?: string;
  isPath?: boolean;
  visibilityMode?: string;
  taggedResourceAclGrantScope?: AccessControlScope;
  taggedResourceAclGrantSpecifiedUsers?: string[];
  tagMountPermissionScope?: AccessControlScope;
  tagMountSpecifiedUsers?: string[];
  grantedActions?: TagResourceActionKey[];
}

export interface ChangeTagApiRequest {
  groupId?: string;
  tagName?: string;
  tagDesc?: string;
  tagIcon?: string;
  tagColor?: string;
  tagCreator?: string;
  isPath?: boolean;
  visibilityMode?: string;
  taggedResourceAclGrantScope?: AccessControlScope;
  taggedResourceAclGrantSpecifiedUsers?: string[];
  tagMountPermissionScope?: AccessControlScope;
  tagMountSpecifiedUsers?: string[];
  grantedActions?: TagResourceActionKey[];
  targetTagId: string;
}

export interface RemoveTagApiRequest {
  groupId?: string;
  targetTagId: string;
}

export interface MoveTagApiRequest {
  groupId?: string;
  targetTagId: string;
  newParentId?: string;
}

export interface GetTagTreeApiRequest {
  groupId?: string;
}

export interface TagTreeResponse {
  tagId: string;
  tagName: string;
  groupId?: string;
  tagDesc?: string;
  tagIcon?: string;
  tagColor?: string;
  tagCreator?: string;
  isPath?: boolean;
  visibilityMode?: string;
  taggedResourceAclGrantScope?: AccessControlScope;
  taggedResourceAclGrantSpecifiedUsers?: string[];
  taggedResourceGrantedActionsMask?: number;
  tagMountPermissionScope?: AccessControlScope;
  tagMountSpecifiedUsers?: string[];
  grantedActions?: number[];
  parentId?: string;
  children?: TagTreeResponse[];
}

export type GetTagTreeApiResponse = TagTreeResponse[];
