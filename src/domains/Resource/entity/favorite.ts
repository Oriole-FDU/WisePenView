/**
 * 收藏领域前端实体
 * 经 mapper 归一化后供 view/component 使用，不直接暴露后端 DTO
 */

/** 收藏集合 */
export interface FavoriteCollection {
  collectionId: string;
  /** null = 默认收藏集合，前端显示"我的收藏" */
  collectionName: string | null;
  description: string | null;
  isDefault: boolean;
  itemCount: number;
  /** 毫秒时间戳 */
  createTime: number;
}

/**
 * 收藏列表资源信息
 */
export interface FavoriteResourceInfo {
  resourceId: string;
  resourceName: string;
  /** 对应 ResourceTypeEnum 字符串值 */
  resourceType: string;
  ownerId: string;
  preview: string | null;
  /** autoGen 为 number，若后端实际传 string 则由 normalizeResourceItem 转换 */
  size: number | null;
  favoriteCount: number;
  likeCount: number | null;
  readCount: number | null;
  scoreAvg: number | null;
}

/** 收藏列表条目 */
export interface FavoriteItem {
  resourceId: string;
  accessible: boolean;
  /** 毫秒时间戳 */
  favoritedAt: number;
  collectionIds: string[];
  /** accessible=true 时填充，false（资源已删除）时为 null */
  resourceInfo: FavoriteResourceInfo | null;
}

/** 收藏内容分页结果 */
export interface FavoritedResourcesPage {
  list: FavoriteItem[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}
