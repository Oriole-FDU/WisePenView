import type { JavaLongApiValue, NumericEnumApiValue, PageApiRequest, PageR } from '@/apis/api.type';
import type { UserDisplayBaseApiResponse } from '@/domains/User/apis/UserApi.type';

export type ResourceActionApiKey =
  | 'DISCOVER'
  | 'VIEW'
  | 'LOAD'
  | 'EDIT'
  | 'INLINE_COMMENT'
  | 'DOWNLOAD_WATERMARK'
  | 'DOWNLOAD_ORIGINAL'
  | 'FORK'
  | 'COMMENT';
type ResourceActionApiValue = ResourceActionApiKey | NumericEnumApiValue;
export type ResourceActionApiList = ResourceActionApiValue[];
export interface ResourceInteractionInfoApiResponse {
  readCount?: JavaLongApiValue | null;
  likeCount?: JavaLongApiValue | null;
  scoreCount?: JavaLongApiValue | null;
  scoreTotal?: JavaLongApiValue | null;
  favoriteCount?: JavaLongApiValue | null;
  commentCount?: JavaLongApiValue | null;
}

export interface ResourceUserInteractionRecordApiResponse {
  read?: boolean | null;
  liked?: boolean | null;
  score?: number | null;
  likedCommentIds?: string[] | null;
  resourceId?: string | null;
}

interface ResourceTagInfoApiResponse {
  tagName?: string;
  tagDesc?: string;
  tagIcon?: string;
  tagColor?: string;
  tagCreator?: string;
  isPath?: boolean;
}

interface ResourceTagBindApiResponse {
  groupId?: string;
  primaryTagId?: string;
  tags?: Record<string, ResourceTagInfoApiResponse | null | undefined>;
}

type ResourceGroupTypeApiValue = NumericEnumApiValue<1 | 2 | 3>;

export interface ResourceGroupDisplayBaseApiResponse {
  groupName?: string | null;
  groupDesc?: string | null;
  groupCoverUrl?: string | null;
  groupType?: ResourceGroupTypeApiValue | null;
}

export interface ResourceGroupGrantedActionsApiResponse {
  groupId: string;
  groupInfo?: ResourceGroupDisplayBaseApiResponse | null;
  grantedActions?: ResourceActionApiList | null;
}

export interface ResourceSpecifiedUserGrantedActionsApiResponse {
  userId: string;
  userInfo?: UserDisplayBaseApiResponse | null;
  grantedActions?: ResourceActionApiList | null;
}

export interface ResourceItemApiResponse {
  resourceId: string;
  resourceName: string;
  ownerId?: string;
  size?: JavaLongApiValue | null;
  ownerInfo: UserDisplayBaseApiResponse;
  resourceType?: string;
  preview?: string;
  path?: string;
  resourceInteractionInfo?: ResourceInteractionInfoApiResponse;
  myInteractionRecord?: ResourceUserInteractionRecordApiResponse | null;
  tagBinds?: ResourceTagBindApiResponse[];
  currentActions?: ResourceActionApiList | null;
  resourceAccessRole?: 'OWNER' | 'OWNER_SPECIFIED' | 'GROUP_ADMIN' | 'GROUP_MEMBER' | 'NONE';
  overrideGrantedActions?: ResourceGroupGrantedActionsApiResponse[] | null;
  specifiedUsersGrantedActions?: ResourceSpecifiedUserGrantedActionsApiResponse[] | null;
}

export type ResourceListPageApiResponse = PageR<ResourceItemApiResponse>;

export interface ListResourceItemsApiRequest extends PageApiRequest {
  sortBy: string;
  sortDir: string;
  resourceType?: string;
  tagIds?: string[];
  tagQueryLogicMode?: string;
  groupId?: string;
  includeMyInteraction?: boolean;
}

export interface RenameResourceApiRequest {
  resourceId: string;
  newName: string;
}

export interface ChangeResourceTagsApiRequest {
  resourceId: string;
  tagIds: string[];
  groupId?: string;
  primaryTagId?: string;
}

export interface ChangeResourceActionPermissionApiRequest {
  resourceId: string;
  overrideGrantedActions?: Record<string, ResourceActionApiKey[] | null> | null;
  specifiedUsersGrantedActions?: Record<string, ResourceActionApiKey[]> | null;
}

export interface RemoveResourcesApiRequest {
  resourceIds: string[];
}

export interface GlobalSearchApiRequest extends PageApiRequest {
  keyword: string;
  scope: string;
}

export interface GlobalSearchItemApiResponse {
  resourceId: string;
  resourceType: string;
  resourceName: string;
  highlightContent: string | null;
  updateTime: string;
}

export type GlobalSearchApiResponse = PageR<GlobalSearchItemApiResponse>;
