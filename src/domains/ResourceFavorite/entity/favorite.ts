import type { ResourceItem } from '@/domains/Resource';

/** 收藏集合 */
export interface FavoriteCollection {
  collectionId: string;
  /** null 表示默认收藏集合 */
  collectionName: string | null;
  description: string | null;
  isDefault: boolean;
  itemCount: number;
}

/** 收藏条目 */
export interface FavoriteItem {
  resourceId: string;
  favoritedAt: number;
  resourceInfo: ResourceItem | null;
}

/** 收藏内容分页结果 */
export interface FavoritedResourcesPage {
  list: FavoriteItem[];
  total: number;
  totalPage: number;
}
