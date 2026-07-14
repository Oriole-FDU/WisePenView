import type { ResourceItemApiResponse } from './ResourceApi.type';

/** POST /resource/favorite/changeResourceFavoriteStatus 请求体 */
export interface ChangeFavoriteStatusApiRequest {
  resourceId: string;
  favorite: boolean;
  collectionIds?: string[];
}

/** POST /resource/favorite/createCollection 请求体 */
export interface CreateCollectionApiRequest {
  collectionName: string;
  description?: string | null;
}

/** POST /resource/favorite/updateCollectionInfo 请求体 */
export interface UpdateCollectionInfoApiRequest {
  collectionId: string;
  collectionName: string;
  description?: string | null;
}

/** POST /resource/favorite/deleteCollection 请求体 */
export interface DeleteCollectionApiRequest {
  collectionId: string;
  keepResourcesToDefault?: boolean;
}

/** GET /resource/favorite/getResourceFavoriteStatus 响应 data */
export interface GetFavoriteStatusApiResponse {
  /** 未收藏时为 []，后端保证不为 null */
  collectionIds: string[];
}

/** 收藏集合响应；createTime 实际为毫秒时间戳 */
export interface FavoriteCollectionApiResponse {
  collectionId?: string;
  /** 默认收藏集合的 collectionName 为 null */
  collectionName?: string | null;
  description?: string | null;
  isDefault?: boolean;
  itemCount?: number;
  createTime?: number;
}

/** 收藏条目响应；favoritedAt 实际为毫秒时间戳 */
export interface FavoriteItemApiResponse {
  resourceId?: string;
  resourceInfo?: ResourceItemApiResponse | null;
  favoritedAt?: number;
  collectionIds?: string[];
  accessible?: boolean;
}

/** GET /resource/favorite/listFavoritedResources 请求参数 */
export interface ListFavoritedResourcesApiRequest {
  collectionId?: string;
  page?: number;
  size?: number;
}

/** GET /resource/favorite/listFavoritedResources 响应 data */
export interface ListFavoritedResourcesApiResponse {
  list: FavoriteItemApiResponse[];
  /** Java long 序列化为 string，需 Number() 转换 */
  total: string;
  page: number;
  size: number;
  totalPage: number;
}
