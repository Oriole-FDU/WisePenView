/**
 * Resource 领域模型
 * path 与 tags：path 为路径/文件夹归属；currentTags 与 docs/apis/resource.openapi.json ResourceItemResponse 字段一致
 */

/** 资源项（与 OpenAPI ResourceItemResponse 字段一致） */
export interface ResourceItem {
  resourceId?: string;
  resourceName?: string;
  resourceType?: string;
  ownerId?: string;
  preview?: string;
  size?: number;
  /** 归属路径（文件夹），如 '/' 或 '/documents/notes' */
  path?: string;
  /** 当前标签 ID 或名称列表，与接口返回一致 */
  currentTags?: string[];
}

/** 资源列表分页（与 OpenAPI PageResultResourceItemResponse 一致） */
export interface ResourceListPage {
  list: ResourceItem[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}
