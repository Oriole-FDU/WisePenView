/**
 * Resource 相关 API 请求类型
 * 与 resource.openapi.json 对齐
 */

import type {
  ResourceItem,
  ResourceSortBy,
  ResourceSortDir,
  TagQueryLogicMode,
} from '@/domains/Resource';

/** 资源列表分页（与 OpenAPI PageResultResourceItemResponse 一致） */
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
  updateResourceTags(params: UpdateResourceTagsRequest): Promise<void>;
  /** 点赞 / 取消点赞，返回操作后最新状态 */
  interactToggleLike(params: InteractToggleLikeRequest): Promise<InteractToggleLikeResult>;
  /** 评分（1–5），支持覆盖，返回最新 userScore */
  interactRate(params: InteractRateRequest): Promise<InteractRateResult>;
}

/** 重命名资源请求参数（对齐 OpenAPI ResourceRenameRequest，POST /resource/item/renameRes） */
export interface RenameResourceRequest {
  resourceId: string;
  newName: string;
}

/** 更新资源用户标签（对齐 OpenAPI ResourceUpdateTagsRequest，POST /resource/item/updateTags） */
export interface UpdateResourceTagsRequest {
  resourceId: string;
  tagIds: string[];
  groupId?: string;
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

/** 点赞 / 取消点赞请求参数（对齐 POST /resource/interact/toggleLike） */
export interface InteractToggleLikeRequest {
  resourceId: string;
}

/** 点赞操作响应：返回操作后的最新点赞状态 */
export interface InteractToggleLikeResult {
  liked: boolean;
}

/** 评分请求参数（对齐 POST /resource/interact/rate） */
export interface InteractRateRequest {
  resourceId: string;
  /** 1–5 整数，支持覆盖提交 */
  score: number;
}

/** 评分操作响应：返回最新 userScore */
export interface InteractRateResult {
  userScore: number;
}
