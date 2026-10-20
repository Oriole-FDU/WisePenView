import type { OptionalPageApiRequest, PageR } from '@/apis/api.type';
import type { ResourceItemApiResponse } from '@/domains/Resource/apis/ResourceApi.type';

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
  collectionIds: string[];
}

/** 收藏集合响应；时间戳使用毫秒 */
export interface FavoriteCollectionApiResponse {
  collectionId: string;
  collectionName: string;
  description: string | null;
  isDefault: boolean;
  itemCount: number;
  createTime: number;
}

/** 收藏条目响应 */
export interface FavoriteItemApiResponse {
  resourceId: string;
  resourceInfo: ResourceItemApiResponse | null;
  favoritedAt: number;
  collectionIds: string[];
  accessible: boolean;
}

/** GET /resource/favorite/listFavoritedResources 请求参数 */
export interface ListFavoritedResourcesApiRequest extends OptionalPageApiRequest {
  collectionId?: string;
}

/** GET /resource/favorite/listFavoritedResources 响应 data */
export type ListFavoritedResourcesApiResponse = PageR<FavoriteItemApiResponse>;
