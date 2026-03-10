/**
 * Resource 领域模型
 * 与 resource.openapi.json 中 ResourceItemResponse 一致
 */

/** 资源项实体 */
export interface ResourceItem {
  resourceId: string;
  resourceName: string;
  resourceType?: string;
  ownerId?: string;
  preview?: string;
  size?: number;
  currentTags?: string[];
}

/** 资源列表分页结果（与 OpenAPI PageResultResourceItemResponse 一致） */
export interface ResourceListPage {
  list: ResourceItem[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}
