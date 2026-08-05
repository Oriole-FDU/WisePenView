import type { UserDisplayBase } from '@/domains/User';
import type { ResourceAction } from '../enum';
/** Resource 领域模型 */

/** 与后端 ResourceAccessRole 字面值一致 */
export type ResourceAccessRole =
  'OWNER' | 'OWNER_SPECIFIED' | 'GROUP_ADMIN' | 'GROUP_MEMBER' | 'NONE';

export type ResourceIconType =
  'file' | 'doc' | 'ppt' | 'xls' | 'pdf' | 'md' | 'note' | 'drawio' | 'skill' | 'agent';

export interface ResourceTagInfo {
  tagName?: string;
  tagDesc?: string;
  tagIcon?: string;
  tagColor?: string;
  tagCreator?: string;
  isPath?: boolean;
}

export interface ResourceTagBind {
  groupId?: string;
  /** 后端 ResourceTagBindResponse.primaryTagId：该组内的主挂载标签。 */
  primaryTagId?: string;
  tags?: Record<string, ResourceTagInfo | null | undefined>;
}

export interface ResourceUserInteraction {
  read: boolean;
  liked: boolean;
  score?: number;
  likedCommentIds: string[];
}

/** 供前端展示与业务编排使用的稳定资源实体 */
export interface ResourceItem {
  resourceId: string;
  resourceName: string;
  ownerId?: string;
  ownerInfo: UserDisplayBase;
  resourceType?: string;
  preview?: string;
  size?: number;
  /** 有效阅读量，历史数据可能为 null，展示时用 readCount ?? 0 */
  readCount?: number | null;
  /** 归属路径（文件夹），如 '/' 或 '/documents/notes' */
  path?: string;
  /** 当前上下文标签映射（tagId → tagName），由 tagBinds 派生。 */
  currentTags?: Record<string, string>;
  /** 后端按 group 维度返回的有序标签绑定，tags 使用 LinkedHashMap 保持 tagIds 顺序。 */
  tagBinds?: ResourceTagBind[];
  /** 图标展示用资源细分类型，避免污染 resourceType 的跳转语义 */
  resourceIconType?: ResourceIconType;
  /** 主挂载标签，优先来自 tagBinds.primaryTagId。 */
  mainTagId?: string;
  /** 链接挂载标签（当前 tagBind.tags 去掉 mainTagId 后的其余项） */
  linkTagIds?: string[];
  /** 当前用户对该资源已生效的权限动作（详情接口返回） */
  currentActions?: ResourceAction[] | null;
  /** 当前用户对该资源的访问角色（详情接口返回） */
  resourceAccessRole?: ResourceAccessRole;
  // ---- 权限配置字段 ----
  /** 资源级组覆盖权限，key 为 groupId，仅 owner 查询资源详情时返回 */
  overrideGrantedActions?: Record<string, ResourceAction[]> | null;
  /** 指定用户资源权限，key 为 userId，仅 owner 查询资源详情时返回 */
  specifiedUsersGrantedActions?: Record<string, ResourceAction[]> | null;
  // ---- 互动字段 ----
  /** 资源总点赞数，后端不为 null */
  likeCount?: number | null;
  /** 资源总收藏人数，同一用户多集合收藏只计一次 */
  favoriteCount?: number | null;
  /** 顶级评论与回复合计数量 */
  commentCount?: number | null;
  /** 平均评分，暂无评分时为 null，不得展示 0.0 */
  scoreAvg?: number | null;
  /** 当前用户对该资源的交互状态，仅在列表请求显式要求时返回。 */
  myInteraction?: ResourceUserInteraction;
}
