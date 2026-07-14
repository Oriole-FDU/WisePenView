/**
 * Resource 相关 API 请求类型
 * 与 resource.openapi.json 对齐
 */

import type {
  ResourceAction,
  ResourceIconType,
  ResourceItem,
  ResourceSortBy,
  ResourceSortDir,
  SearchResourceType,
  SearchScope,
  TagQueryLogicMode,
} from '@/domains/Resource';
import type { FavoriteCollection, FavoritedResourcesPage } from '../entity/favorite';

/** 资源列表分页 */
export interface ResourceListPage {
  list: ResourceItem[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}

/** ResourceService 接口：供依赖注入使用 */
export interface IResourceService {
  getUserResources(params: GetUserResourcesRequest): Promise<ResourceListPage>;
  getGroupResources(params: GetGroupResourceRequest): Promise<ResourceListPage>;
  renameResource(params: RenameResourceRequest): Promise<void>;
  removeResources(params: RemoveResourcesRequest): Promise<void>;
  updateResourceTags(params: UpdateResourceTagsRequest): Promise<void>;
  mountResourcesToGroupTag(params: MountResourcesToGroupTagRequest): Promise<void>;
  updateResourceActionPermission(params: UpdateResourceActionPermissionRequest): Promise<void>;
  updateResourcePermissionSubjects(params: UpdateResourcePermissionSubjectsRequest): Promise<void>;
  /** 获取 View 直接消费的资源权限概览 */
  getResourcePermissionOverview(
    params: GetResourcePermissionOverviewRequest
  ): Promise<ResourcePermissionOverview>;
  /** 获取当前用户点赞状态，供点赞组件薄层调用 */
  getLikeStatus(resourceId: string): Promise<{ liked: boolean }>;
  /** 获取当前用户评分，供评分组件薄层调用 */
  getRate(resourceId: string): Promise<{ score: number }>;
  /** 点赞 / 取消点赞 */
  interactToggleLike(params: InteractToggleLikeRequest): Promise<void>;
  /** 评分（1–5），支持覆盖 */
  interactRate(params: InteractRateRequest): Promise<void>;
  /** 上报资源阅读（详情页 / 文档预览页进入时调用一次） */
  interactRead(resourceId: string): Promise<void>;
  /** 全局全文搜索（ACL 过滤 + 高亮，分页） */
  globalSearch(params: SearchQueryRequest): Promise<SearchResultPage>;
  /** 查询资源行内批注列表 */
  listInlineComments(params: ListInlineCommentsRequest): Promise<ResourceInlineCommentThread[]>;
  /** 创建行内批注串 */
  createInlineComment(params: CreateInlineCommentRequest): Promise<string>;
  /** 追加批注回复 */
  addInlineCommentItem(params: AddInlineCommentItemRequest): Promise<string>;
  /** 修改批注回复 */
  updateInlineCommentItem(params: UpdateInlineCommentItemRequest): Promise<void>;
  /** 删除批注回复 */
  deleteInlineCommentItem(params: DeleteInlineCommentItemRequest): Promise<void>;
  /** 更新批注串解决状态 */
  changeInlineCommentResolveStatus(params: ChangeInlineCommentResolveStatusRequest): Promise<void>;
  /** 查询资源收藏状态，collectionIds 非空表示已收藏 */
  getFavoriteStatus(resourceId: string): Promise<{ collectionIds: string[] }>;
  /** 更改资源收藏状态，favorite=true 时 collectionIds 为全量替换语义 */
  changeFavoriteStatus(params: ChangeFavoriteStatusRequest): Promise<void>;
  /** 查询当前用户收藏集合 */
  listCollections(): Promise<FavoriteCollection[]>;
  /** 创建收藏集合，返回 collectionId */
  createCollection(params: CreateCollectionRequest): Promise<string>;
  /** 更新收藏集合信息 */
  updateCollectionInfo(params: UpdateCollectionInfoRequest): Promise<void>;
  /** 删除收藏集合 */
  deleteCollection(params: DeleteCollectionRequest): Promise<void>;
  /** 分页查询已收藏资源 */
  listFavoritedResources(params: ListFavoritedResourcesRequest): Promise<FavoritedResourcesPage>;
}

/** 全文搜索请求（对齐 GET /resource/search/globalSearchResources） */
export interface SearchQueryRequest {
  keyword: string;
  scope: SearchScope;
  page: number;
  size: number;
}

/** 单条搜索命中项；resourceName/highlightContent 含 wp-highlight 包裹；resourceType 已归一化为枚举值 */
export interface SearchHitItem {
  resourceId: string;
  resourceType: SearchResourceType;
  resourceIconType: ResourceIconType;
  resourceName: string;
  highlightContent: string | null;
  updateTime: string;
}

/** 搜索分页结果 */
export interface SearchResultPage {
  list: SearchHitItem[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}

/** 重命名资源请求参数（对齐 OpenAPI ResourceRenameRequest，POST /resource/item/renameRes） */
export interface RenameResourceRequest {
  resourceId: string;
  newName: string;
}

/** 删除资源请求参数（对齐 OpenAPI ResourceRemoveRequest，POST /resource/item/removeResources） */
export interface RemoveResourcesRequest {
  resourceIds: string[];
}

/** 更新资源标签（对齐 OpenAPI ResourceUpdateTagsRequest，POST /resource/item/changeResourceTags） */
export interface UpdateResourceTagsRequest {
  resourceId: string;
  tagIds: string[];
  groupId?: string;
  /** 该资源在当前空间没有主挂载时，用目标标签初始化主挂载 */
  primaryTagId?: string;
}

/** 上传/挂载资源到小组标签：已有主挂载则只追加 tags，没有主挂载则同时初始化 primaryTagId */
export interface MountResourcesToGroupTagRequest {
  resourceIds: string[];
  groupId: string;
  tagId: string;
}

/** 更新单个资源的动作权限配置 */
export interface UpdateResourceActionPermissionRequest {
  resourceId: string;
  overrideGrantedActions?: Record<string, ResourceAction[] | null> | null;
  specifiedUsersGrantedActions?: Record<string, ResourceAction[]> | null;
}

export interface UpdateResourcePermissionSubjectsRequest {
  resourceId: string;
  subjects: ResourcePermissionSubject[];
}

export type ResourcePermissionResourceType = 'note' | 'drawio' | 'file' | 'skill' | 'agent';

export interface GetResourcePermissionOverviewRequest {
  resourceId: string;
  resourceType: ResourcePermissionResourceType;
}

export type ResourcePermissionSubjectKind = 'owner' | 'group' | 'user';
export type ResourcePermissionSource = 'owner' | 'tag' | 'resourceOverride' | 'specifiedUser';

export interface ResourcePermissionActionOption {
  action: ResourceAction;
  key: string;
  label: string;
  supported: boolean;
}

export interface ResourcePermissionSubject {
  id: string;
  kind: ResourcePermissionSubjectKind;
  source: ResourcePermissionSource;
  name: string;
  description?: string;
  avatar?: string;
  groupId?: string;
  primaryTagId?: string;
  userId?: string;
  effectiveActions: ResourceAction[];
  editableActions: ResourceAction[];
  inheritedActions?: ResourceAction[];
  readonly?: boolean;
}

export interface ResourcePermissionOverview {
  resourceId: string;
  resourceType?: string;
  owner?: ResourcePermissionSubject;
  subjects: ResourcePermissionSubject[];
  supportedActions: ResourceAction[];
  actionOptions: ResourcePermissionActionOption[];
}

/**
 * 获取用户资源列表请求参数（个人所有资源，group 不暴露、强制留空）
 * 对齐 GET /resource/item/list 的 query 参数
 */
export interface GetUserResourcesRequest {
  page: number;
  size: number;
  sortBy: ResourceSortBy;
  sortDir: ResourceSortDir;
  resourceType?: string;
  /** 按标签筛选，传 tagId 列表 */
  tagIds?: string[];
  /** 标签查询逻辑：OR=包含任意，AND=包含全部 */
  tagQueryLogicMode?: TagQueryLogicMode;
}

/** 获取小组资源列表请求参数（groupId 必填） */
export type GetGroupResourceRequest = GetUserResourcesRequest & {
  groupId: string;
};

/** 点赞 / 取消点赞请求参数（对齐 POST /resource/interaction/toggleLike） */
export interface InteractToggleLikeRequest {
  resourceId: string;
}

/** 评分请求参数（对齐 POST /resource/interaction/rate） */
export interface InteractRateRequest {
  resourceId: string;
  /** 1–5 整数，支持覆盖提交 */
  score: number;
}

export type ResourceInlineCommentAnchorKind =
  'text-range' | 'formula-inline' | 'formula-block' | 'unknown';

export interface ResourceInlineCommentAuthorInfo {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface ResourceInlineCommentAnchor {
  externalAnchorId: string;
  quoteText: string;
  anchorPayload: Record<string, unknown>;
  kind: ResourceInlineCommentAnchorKind;
}

export interface ResourceInlineCommentItem {
  itemId: string;
  authorId: string;
  authorInfo?: ResourceInlineCommentAuthorInfo;
  content: string;
  imageUrls: string[];
  mentionUserIds: string[];
  createTime?: string;
  updateTime?: string;
}

export interface ResourceInlineCommentThread {
  inlineCommentId: string;
  resourceId: string;
  creatorId: string;
  creatorInfo?: ResourceInlineCommentAuthorInfo;
  resolved: boolean;
  resolvedBy?: string;
  resolvedByInfo?: ResourceInlineCommentAuthorInfo;
  resolvedAt?: string;
  applicableFromVersion?: number;
  applicableToVersion?: number;
  createTime?: string;
  updateTime?: string;
  anchor: ResourceInlineCommentAnchor;
  items: ResourceInlineCommentItem[];
}

export interface ListInlineCommentsRequest {
  resourceId: string;
  contentVersion?: number;
  resolved?: boolean;
}

export interface CreateInlineCommentRequest {
  resourceId: string;
  externalAnchorId: string;
  quoteText?: string;
  anchorPayload?: Record<string, unknown>;
  contentVersion?: number;
  applicableFromVersion?: number;
  applicableToVersion?: number;
  content: string;
  imageUrls?: string[];
  mentionUserIds?: string[];
}

export interface AddInlineCommentItemRequest {
  resourceId: string;
  inlineCommentId: string;
  contentVersion?: number;
  content: string;
  imageUrls?: string[];
  mentionUserIds?: string[];
}

export interface UpdateInlineCommentItemRequest {
  resourceId: string;
  inlineCommentId: string;
  itemId: string;
  contentVersion?: number;
  content: string;
  imageUrls?: string[];
  mentionUserIds?: string[];
}

export interface DeleteInlineCommentItemRequest {
  resourceId: string;
  inlineCommentId: string;
  itemId: string;
}

export interface ChangeInlineCommentResolveStatusRequest {
  resourceId: string;
  inlineCommentId: string;
  resolved: boolean;
  contentVersion?: number;
}

export interface ChangeFavoriteStatusRequest {
  resourceId: string;
  favorite: boolean;
  collectionIds?: string[];
}

export interface CreateCollectionRequest {
  collectionName: string;
  description?: string | null;
}

export interface UpdateCollectionInfoRequest {
  collectionId: string;
  collectionName: string;
  description?: string | null;
}

export interface DeleteCollectionRequest {
  collectionId: string;
  keepResourcesToDefault?: boolean;
}

export interface ListFavoritedResourcesRequest {
  collectionId?: string;
  page: number;
  size: number;
}
