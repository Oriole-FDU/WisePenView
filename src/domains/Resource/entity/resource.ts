import type { UserDisplayBase } from '@/domains/User';
import type { ResourceAction } from '../enum';
/**
 * Resource 领域模型
 * path 与 tags：path 为路径/文件夹归属；currentTags 与 docs/apis/resource.openapi.json ResourceItemResponse 字段一致
 */

/** 资源项（与 OpenAPI ResourceItemResponse 字段一致） */
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
  /** 当前标签映射（tagId → tagName），与接口返回一致 */
  currentTags?: Record<string, string>;
  /** 主挂载标签（约定取 currentTags 的第一项） */
  mainTagId?: string;
  /** 链接挂载标签（currentTags 去掉 mainTagId 后的其余项） */
  linkTagIds?: string[];
  /** 当前用户对该资源已生效的权限动作（详情接口返回） */
  currentActions?: ResourceAction[] | null;
  // ---- 权限配置字段 ----
  /** 资源级覆盖权限，仅 owner 查询资源详情时返回 */
  overrideGrantedActions?: ResourceAction[] | null;
  /** 指定用户资源权限，key 为 userId，仅 owner 查询资源详情时返回 */
  specifiedUsersGrantedActions?: Record<string, ResourceAction[]> | null;
  // ---- 互动字段 ----
  /** 资源总点赞数，后端不为 null */
  likeCount?: number | null;
  /** 平均评分，暂无评分时为 null，不得展示 0.0 */
  scoreAvg?: number | null;
  /** 当前用户是否已点赞，后端不为 null */
  liked?: boolean;
  /** 当前用户评分（1-5），未评分时为 null；列表接口固定返回 null */
  userScore?: number | null;
}
