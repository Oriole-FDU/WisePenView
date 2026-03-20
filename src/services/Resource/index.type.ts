/**
 * Resource 相关 API 请求类型
 * 与 resource.openapi.json 对齐
 */

import type { ResourceListPage } from '@/types/resource';

/** ResourceService 接口：供依赖注入使用 */
export interface IResourceService {
  getUserResources(params: GetUserResourcesRequest): Promise<ResourceListPage>;
  getGroupResources(params: GetGroupResourceRequest): Promise<ResourceListPage>;
  renameResource(params: RenameResourceRequest): Promise<void>;
  deleteResource(resourceId: string): Promise<void>;
  updateResourcePath(params: UpdateResourcePathRequest): Promise<void>;
  updateResourceTags(params: UpdateResourceTagsRequest): Promise<void>;
}

/** 排序字段枚举 */
export const RESOURCE_SORT_BY = {
  UPDATE_TIME: 'UPDATE_TIME',
  CREATE_TIME: 'CREATE_TIME',
  NAME: 'NAME',
  SIZE: 'SIZE',
} as const;

/** 排序方向枚举 */
export const RESOURCE_SORT_DIR = {
  ASC: 'ASC',
  DESC: 'DESC',
} as const;

/** 标签查询逻辑：OR=包含任意标签，AND=包含全部标签 */
export const TAG_QUERY_LOGIC_MODE = {
  OR: 'OR',
  AND: 'AND',
} as const;

export type TagQueryLogicMode = (typeof TAG_QUERY_LOGIC_MODE)[keyof typeof TAG_QUERY_LOGIC_MODE];

export type ResourceSortBy = (typeof RESOURCE_SORT_BY)[keyof typeof RESOURCE_SORT_BY];
export type ResourceSortDir = (typeof RESOURCE_SORT_DIR)[keyof typeof RESOURCE_SORT_DIR];

/** 重命名资源请求参数（对齐 OpenAPI ResourceRenameRequest，POST /resource/item/renameRes） */
export interface RenameResourceRequest {
  resourceId: string;
  newName: string;
}

/**
 * 更新资源归属路径（移动文件到文件夹）
 * 注意：resource.openapi.json 当前未声明该能力，实现层仍请求 /resource/move
 */
export interface UpdateResourcePathRequest {
  resourceId: string;
  /** 目标路径，如 '/' 或 '/documents/notes' */
  path: string;
  groupId?: string;
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
  sortBy: (typeof RESOURCE_SORT_BY)[keyof typeof RESOURCE_SORT_BY];
  sortDir: (typeof RESOURCE_SORT_DIR)[keyof typeof RESOURCE_SORT_DIR];
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
