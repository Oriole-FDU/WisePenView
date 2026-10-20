import type { Nullable, PageApiRequest, PageR } from '@/apis/api.type';
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
  score: Nullable<number>;
  likedCommentIds: string[];
  resourceId: string;
}

export interface ResourceTagInfoApiResponse {
  groupId: string;
  tagName: string;
  tagDesc: Nullable<string>;
  tagIcon: Nullable<string>;
  tagColor: Nullable<string>;
  tagMetaInfo: Nullable<string>;
  tagCreator: Nullable<string>;
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
  groupDesc: Nullable<string>;
  groupCoverUrl: Nullable<string>;
  groupType: ResourceGroupTypeApiValue;
  groupMetaInfo: Nullable<string>;
}

export interface ResourceGroupGrantedActionsApiResponse {
  groupId: string;
  groupInfo: Nullable<ResourceGroupDisplayBaseApiResponse>;
  grantedActions: ResourceActionApiList;
}

export interface ResourceSpecifiedUserGrantedActionsApiResponse {
  userId: string;
  userInfo: Nullable<UserDisplayBaseApiResponse>;
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
  offerVersion: Nullable<number>;
  auditMessage: Nullable<string>;
  auditAt: Nullable<number>;
}

export interface ResourceItemApiResponse {
  resourceId: string;
  resourceName: string;
  ownerId: string;
  size: Nullable<string>;
  ownerInfo: Nullable<UserDisplayBaseApiResponse>;
  resourceType: ResourceTypeApiValue;
  preview: Nullable<string>;
  resourceInteractionInfo: ResourceInteractionInfoApiResponse;
  myInteractionRecord: Nullable<ResourceUserInteractionRecordApiResponse>;
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
  overrideGrantedActions?: Nullable<Record<string, Nullable<ResourceActionApiKey[]>>>;
  specifiedUsersGrantedActions?: Nullable<Record<string, ResourceActionApiKey[]>>;
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
  highlightContent: Nullable<string>;
  updateTime: number;
}

export type GlobalSearchApiResponse = PageR<GlobalSearchItemApiResponse>;
