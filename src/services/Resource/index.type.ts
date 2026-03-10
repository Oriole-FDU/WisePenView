/**
 * Resource 相关 API 请求类型
 * 与 resource.openapi.json 对齐
 */

// 以下枚举字段没有放入 type/constants，原因是他们只是请求参数的一部分，不涉及业务逻辑，放置在这里更内聚，便于维护

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

export type TagQueryLogicMode =
  (typeof TAG_QUERY_LOGIC_MODE)[keyof typeof TAG_QUERY_LOGIC_MODE];

export type ResourceSortBy =
  (typeof RESOURCE_SORT_BY)[keyof typeof RESOURCE_SORT_BY];
export type ResourceSortDir =
  (typeof RESOURCE_SORT_DIR)[keyof typeof RESOURCE_SORT_DIR];

/** 重命名资源请求参数（OpenAPI renameRes） */
export interface RenameResourceRequest {
  resourceId: string;
  newName: string;
}

/** 更新资源标签请求参数（OpenAPI updateTags） */
export interface UpdateResourceTagsRequest {
  resourceId: string;
  tagIds: string[];
  groupId?: string;
}

/** 获取用户资源列表请求参数（个人所有资源，group 不暴露、强制留空） */
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
