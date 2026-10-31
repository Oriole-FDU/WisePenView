/**
 * Resource 相关 API 请求类型
 * 与 resource.openapi.json 对齐
 */

import type {
  ResourceIconType,
  ResourceItem,
  ResourceSortBy,
  ResourceSortDir,
  SearchResourceType,
  SearchScope,
  TagQueryLogicMode,
} from '@/domains/Resource';

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
  setPersonalResourcesPathTag(params: SetPersonalResourcesPathTagRequest): Promise<number>;
  movePersonalResourcesToTrash(params: MovePersonalResourcesToTrashRequest): Promise<number>;
  replacePersonalNormalTags(params: ReplacePersonalNormalTagsRequest): Promise<number>;
  mountResourcesToGroup(params: MountResourcesToGroupRequest): Promise<number>;
  unmountResourcesToGroup(params: UnmountResourcesToGroupRequest): Promise<number>;
  moveResourcesInGroup(params: MoveResourcesInGroupRequest): Promise<number>;
  /** 全局全文搜索（ACL 过滤 + 高亮，分页） */
  globalSearch(params: SearchQueryRequest): Promise<SearchResultPage>;
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
  /** Java LocalDateTime 经统一 Jackson 配置序列化为毫秒时间戳。 */
  updateTime: number;
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

export interface SetPersonalResourcesPathTagRequest {
  resourceIds: string[];
  targetPathTagId: string;
}

export interface MovePersonalResourcesToTrashRequest {
  resourceIds: string[];
}

export interface ReplacePersonalNormalTagsRequest {
  resourceIds: string[];
  normalTagIds: string[];
}

export interface MountResourcesToGroupRequest {
  resourceIds: string[];
  groupId: string;
  targetTagId: string;
}

export type ResourceSourceTagMap = Record<string, string>;

export interface UnmountResourcesToGroupRequest {
  groupId: string;
  resourceSourceTagMap: ResourceSourceTagMap;
}

export interface MoveResourcesInGroupRequest extends UnmountResourcesToGroupRequest {
  targetTagId: string;
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
  /** 是否随列表批量返回当前用户的资源交互状态。 */
  includeMyInteraction?: boolean;
}

/** 获取小组资源列表请求参数（groupId 必填） */
export type GetGroupResourceRequest = GetUserResourcesRequest & {
  groupId: string;
};
