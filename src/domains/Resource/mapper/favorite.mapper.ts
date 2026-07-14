import type {
  FavoriteCollectionApiResponse,
  FavoriteItemApiResponse,
  ListFavoritedResourcesApiResponse,
} from '../apis/FavoriteApi.type';
import type { ResourceItemApiResponse } from '../apis/ResourceApi.type';
import type {
  FavoriteCollection,
  FavoritedResourcesPage,
  FavoriteItem,
  FavoriteResourceInfo,
} from '../entity/favorite';
import { ResourceServicesMap } from './ResourceServices.map';

/** FavoriteCollectionApiResponse -> FavoriteCollection */
export const mapFavoriteCollectionFromApi = (
  raw: FavoriteCollectionApiResponse
): FavoriteCollection => ({
  collectionId: raw.collectionId ?? '',
  collectionName: raw.collectionName ?? null,
  description: raw.description ?? null,
  isDefault: raw.isDefault ?? false,
  itemCount: raw.itemCount ?? 0,
  createTime: raw.createTime ?? 0,
});

const mapFavoriteResourceInfoFromApi = (raw: ResourceItemApiResponse): FavoriteResourceInfo => {
  const normalized = ResourceServicesMap.mapResourceItemFromApi(raw);
  return {
    resourceId: normalized.resourceId,
    resourceName: normalized.resourceName,
    resourceType: normalized.resourceType ?? '',
    ownerId: normalized.ownerId ?? '',
    preview: normalized.preview ?? null,
    size: normalized.size ?? null,
    favoriteCount: normalized.favoriteCount ?? 0,
    likeCount: normalized.likeCount ?? null,
    readCount: normalized.readCount ?? null,
    scoreAvg: normalized.scoreAvg ?? null,
  };
};

/** FavoriteItemApiResponse -> FavoriteItem */
export const mapFavoriteItemFromApi = (raw: FavoriteItemApiResponse): FavoriteItem => {
  const accessible = raw.accessible ?? false;
  return {
    resourceId: raw.resourceId ?? raw.resourceInfo?.resourceId ?? '',
    accessible,
    favoritedAt: raw.favoritedAt ?? 0,
    collectionIds: raw.collectionIds ?? [],
    resourceInfo:
      accessible && raw.resourceInfo != null
        ? mapFavoriteResourceInfoFromApi(raw.resourceInfo)
        : null,
  };
};

/** ListFavoritedResourcesApiResponse -> FavoritedResourcesPage */
export const mapFavoritedResourcesPageFromApi = (
  raw: ListFavoritedResourcesApiResponse
): FavoritedResourcesPage => ({
  list: (raw.list ?? []).map(mapFavoriteItemFromApi),
  total: Number(raw.total) || 0,
  page: raw.page,
  size: raw.size,
  totalPage: raw.totalPage,
});
