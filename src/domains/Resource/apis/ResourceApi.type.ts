import type { JavaLongApiValue, NumericEnumApiValue } from '@/apis/api.type';
import type { ResourceAction } from '@/domains/_shared/access';
import type { UserDisplayBaseApiResponse } from '@/domains/User/apis/UserApi.type';

import type { ResourceTagInfoApi } from './ResourceCoreApi.schema';

export type ResourceActionApiList = ResourceAction[];
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

interface ResourceTagBindApiResponse {
  groupId?: string;
  primaryTagId?: string;
  /** 尚未迁移的资源叶域只保证部分展示字段，字段定义仍以 ResourceCore Schema 为准。 */
  tags?: Record<string, Partial<ResourceTagInfoApi> | null | undefined>;
}

type ResourceGroupTypeApiValue = NumericEnumApiValue<1 | 2 | 3>;

export interface ResourceGroupDisplayBaseApiResponse {
  groupName?: string | null;
  groupDesc?: string | null;
  groupCoverUrl?: string | null;
  groupType?: ResourceGroupTypeApiValue | null;
  groupMetaInfo?: string | null;
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
  preview?: string | null;
  path?: string;
  resourceInteractionInfo?: ResourceInteractionInfoApiResponse;
  myInteractionRecord?: ResourceUserInteractionRecordApiResponse | null;
  tagBinds?: ResourceTagBindApiResponse[];
  currentActions?: ResourceActionApiList | null;
  resourceAccessRole?: 'OWNER' | 'OWNER_SPECIFIED' | 'GROUP_ADMIN' | 'GROUP_MEMBER' | 'NONE';
  overrideGrantedActions?: ResourceGroupGrantedActionsApiResponse[] | null;
  specifiedUsersGrantedActions?: ResourceSpecifiedUserGrantedActionsApiResponse[] | null;
}
