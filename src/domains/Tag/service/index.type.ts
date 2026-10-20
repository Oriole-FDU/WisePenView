/**
 * Tag 相关类型与 ITagService
 * 与 docs/apis/resource.openapi.json 中 Tag 相关 schema、路径一致（无字段重命名）
 */

import type {
  AccessControlScope,
  TagMetaInfo,
  TagResourceAction,
  TagTreeNode,
} from '@/domains/Tag';

/** TagService 接口：供依赖注入使用 */
export interface ITagService {
  /** 读取小组内所有标签的最新授权，包含路径与隐藏标签，不读写标签树缓存。 */
  getTagGrantedActions(
    groupId: string
  ): Promise<ReadonlyMap<string, TagResourceAction[] | undefined>>;
  /** 获取未过滤的原始标签树（包含路径标签与系统隐藏标签） */
  getRawTagTree(groupId?: string, options?: GetTagTreeOptions): Promise<TagTreeNode[]>;
  /** 从原始标签索引中按 tagId 查找节点（需先调用 getRawTagTree） */
  getRawTagById(tagId: string, groupId?: string): TagTreeNode | undefined;
  /** 获取标签树（带自动过期缓存），返回多个根节点 */
  getTagTree(groupId?: string, options?: GetTagTreeOptions): Promise<TagTreeNode[]>;
  /** 从已缓存的扁平索引中按 tagId 查找标签节点（需先调用 getTagTree） */
  getTagById(tagId: string, groupId?: string): TagTreeNode | undefined;
  updateTag(params: TagUpdateRequest): Promise<void>;
  addTag(params: TagCreateRequest): Promise<string>;
  removeTags(params: RemoveTagsRequest): Promise<void>;
  moveTags(params: MoveTagsRequest): Promise<void>;
  /** 按传入顺序更新一组同级 Tag；Java 暂无批量接口，当前按节点顺序提交。 */
  reorderSiblingTags(params: ReorderSiblingTagsRequest): Promise<void>;
}

export interface GetTagTreeOptions {
  /** 强制绕过本地缓存重新拉取，适用于系统目录被外部手段修改后的恢复检查。 */
  refresh?: boolean;
}

/** POST /resource/tag/addTag */
export interface TagCreateRequest {
  groupId?: string;
  parentId?: string;
  tagName: string;
  tagDesc?: string;
  tagIcon?: string;
  tagColor?: string;
  tagMetaInfo?: TagMetaInfo;
  tagCreator?: string;
  isPath?: boolean;
  taggedResourceAclGrantScope?: AccessControlScope;
  taggedResourceAclGrantSpecifiedUsers?: string[];
  tagMountPermissionScope?: AccessControlScope;
  tagMountSpecifiedUsers?: string[];
  grantedActions?: TagResourceAction[];
}

/** POST /resource/tag/changeTag */
export interface TagUpdateRequest {
  groupId?: string;
  tagName?: string;
  tagDesc?: string;
  tagIcon?: string;
  tagColor?: string;
  tagMetaInfo?: TagMetaInfo;
  tagCreator?: string;
  isPath?: boolean;
  taggedResourceAclGrantScope?: AccessControlScope;
  taggedResourceAclGrantSpecifiedUsers?: string[];
  tagMountPermissionScope?: AccessControlScope;
  tagMountSpecifiedUsers?: string[];
  grantedActions?: TagResourceAction[];
  targetTagId: string;
}

/** POST /resource/tag/removeTags */
export interface RemoveTagsRequest {
  groupId?: string;
  targetTagIds: string[];
}

/** POST /resource/tag/moveTags */
export interface MoveTagsRequest {
  groupId?: string;
  targetTagIds: string[];
  newParentId?: string;
}

export interface ReorderSiblingTagsRequest {
  groupId?: string;
  /** 必须是同一 parentId 下 Tag 的目标展示顺序。 */
  orderedTagIds: string[];
}
