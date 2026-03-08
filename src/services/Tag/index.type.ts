/**
 * Tag 相关 API 请求/响应类型
 * 与 resource.openapi.json 中 Tag 相关 schema 对齐
 */

/** 标签树节点（递归结构，与 OpenAPI TagTreeResponse 一致） */
export interface TagTreeResponse {
  /** 标签 ID */
  tagId: string;
  /** 父节点 ID */
  parentId?: string;
  /** 标签名称 */
  tagName: string;
  /** 标签描述 */
  tagDesc?: string;
  /** 隔离不同用户组的 Tag 树 */
  groupId?: string;
  /** 权限配置 1:ALL 2:ONLY_ADMIN 3:WHITELIST 4:BLACKLIST */
  visibilityMode?: number | null;
  /** 配合白名单/黑名单使用的 userId 列表 */
  specifiedUsers?: string[] | null;
  /** 子节点列表 */
  children?: TagTreeResponse[];
}

/** 获取标签树请求参数 */
export interface GetTagTreeRequest {
  /** 小组 ID，不传则获取个人标签树 */
  groupId?: string;
}

/** 更新标签请求参数 */
export interface UpdateTagRequest {
  /** 标签 ID */
  tagId: string;
  /** 标签名称 */
  tagName: string;
  /** 标签描述 */
  tagDesc?: string;
  /** 小组 ID，更新小组标签时必传 */
  groupId?: string;
}
