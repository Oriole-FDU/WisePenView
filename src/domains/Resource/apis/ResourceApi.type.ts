import type { PageApiRequest, PageR } from '@/apis/api.type';
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
  | 'COMMENT'
  | 'MARKET_VIEW';
export type ResourceActionApiValue = ResourceActionApiKey;
export type ResourceActionApiList = ResourceActionApiValue[];

export type ResourceTypeApiValue =
  | 'NOTE'
  | 'DRAWIO'
  | 'PDF'
  | 'DOC'
  | 'DOCX'
  | 'PPT'
  | 'PPTX'
  | 'XLS'
  | 'XLSX'
  | 'SKILL'
  | 'AGENT'
  | 'UNKNOWN';

export interface ResourceInteractionInfoApiResponse {
  readCount: number;
  likeCount: number;
  scoreCount: number;
  scoreTotal: number;
  favoriteCount: number;
  commentCount: number;
}

export interface ResourceUserInteractionRecordApiResponse {
  read: boolean;
  liked: boolean;
  score: number | null;
  likedCommentIds: string[];
  resourceId: string;
}

export interface ResourceTagInfoApiResponse {
  groupId: string;
  tagName: string;
  tagDesc: string | null;
  tagIcon: string | null;
  tagColor: string | null;
  tagMetaInfo: string | null;
  tagCreator: string | null;
  isPath: boolean;
}

export interface ResourceTagBindApiResponse {
  groupId: string;
  primaryTagId: string;
  tags: Record<string, ResourceTagInfoApiResponse>;
}

type ResourceGroupTypeApiValue = 'NORMAL_GROUP' | 'ADVANCED_GROUP' | 'MARKET_GROUP';

export interface ResourceGroupDisplayBaseApiResponse {
  groupName: string;
  groupDesc: string | null;
  groupCoverUrl: string | null;
  groupType: ResourceGroupTypeApiValue;
  groupMetaInfo: string | null;
}

export interface ResourceGroupGrantedActionsApiResponse {
  groupId: string;
  groupInfo: ResourceGroupDisplayBaseApiResponse | null;
  grantedActions: ResourceActionApiList;
}

export interface ResourceSpecifiedUserGrantedActionsApiResponse {
  userId: string;
  userInfo: UserDisplayBaseApiResponse | null;
  grantedActions: ResourceActionApiList;
}

export interface MarketSaleTierApiResponse {
  offerId: string;
  grantedActions: ResourceActionApiList;
  price: number;
}

export interface MarketSaleInfoApiResponse {
  reviewActions: ResourceActionApiList;
  reviewContentPercentage: number;
  marketSaleTiers: MarketSaleTierApiResponse[];
  status: 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'BANNED' | 'OFF_SHELF';
  offerVersion: number | null;
  auditMessage: string | null;
  auditAt: number | null;
}

export interface ResourceItemApiResponse {
  resourceId: string;
  resourceName: string;
  ownerId: string;
  size: string | null;
  ownerInfo: UserDisplayBaseApiResponse | null;
  resourceType: ResourceTypeApiValue;
  preview: string | null;
  resourceInteractionInfo: ResourceInteractionInfoApiResponse;
  myInteractionRecord: ResourceUserInteractionRecordApiResponse | null;
  tagBinds: ResourceTagBindApiResponse[];
  currentActions: ResourceActionApiList;
  resourceAccessRole: 'OWNER' | 'OWNER_SPECIFIED' | 'GROUP_ADMIN' | 'GROUP_MEMBER' | 'NONE';
  overrideGrantedActions: ResourceGroupGrantedActionsApiResponse[];
  specifiedUsersGrantedActions: ResourceSpecifiedUserGrantedActionsApiResponse[];
  marketSaleInfos: Record<string, MarketSaleInfoApiResponse>;
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
  resourceType: ResourceTypeApiValue;
  resourceName: string;
  highlightContent: string | null;
  updateTime: number;
}

export type GlobalSearchApiResponse = PageR<GlobalSearchItemApiResponse>;
