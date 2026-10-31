import { ResourceServicesMap } from '@/domains/Resource';

import type {
  ChangeFavoriteStatusApiRequest,
  FavoriteCollectionApiResponse,
  FavoriteItemApiResponse,
  ListFavoritedResourcesApiRequest,
  ListFavoritedResourcesApiResponse,
  UpdateCollectionInfoApiRequest,
} from '../apis/FavoriteApi.schema';
import type { FavoriteCollection, FavoritedResourcesPage, FavoriteItem } from '../entity/favorite';
import type {
  ListFavoritedResourcesRequest,
  UpdateFavoriteCollectionRequest,
  UpdateFavoriteCollectionsRequest,
} from '../service/index.type';

const mapFavoriteCollectionFromApi = (data: FavoriteCollectionApiResponse): FavoriteCollection => ({
  collectionId: data.collectionId,
  collectionName: data.collectionName,
  description: data.description,
  isDefault: data.isDefault,
  itemCount: data.itemCount,
});

const mapFavoriteCollectionsFromApi = (
  data: FavoriteCollectionApiResponse[]
): FavoriteCollection[] => data.map(mapFavoriteCollectionFromApi);

const mapUpdateFavoriteCollectionsRequest = (
  params: UpdateFavoriteCollectionsRequest
): ChangeFavoriteStatusApiRequest => {
  const collectionIds = [...params.collectionIds];
  return {
    resourceId: params.resourceId,
    favorite: collectionIds.length > 0,
    ...(collectionIds.length > 0 ? { collectionIds } : {}),
  };
};

const mapUpdateFavoriteCollectionRequest = (
  params: UpdateFavoriteCollectionRequest
): UpdateCollectionInfoApiRequest => ({
  collectionId: params.collectionId,
  collectionName: params.collectionName,
  description: params.description ?? null,
});

const mapListFavoritedResourcesRequest = (
  params: ListFavoritedResourcesRequest
): ListFavoritedResourcesApiRequest => ({
  ...(params.collectionId ? { collectionId: params.collectionId } : {}),
  page: params.page,
  size: params.size,
});

const mapFavoriteItemFromApi = (data: FavoriteItemApiResponse): FavoriteItem => {
  const normalizedResource = data.resourceInfo
    ? ResourceServicesMap.mapResourceItemFromApi(data.resourceInfo)
    : null;
  const resourceInfo = data.accessible ? normalizedResource : null;
  return {
    resourceId: data.resourceId,
    favoritedAt: data.favoritedAt,
    resourceInfo,
  };
};

const mapFavoritedResourcesPageFromApi = (
  data: ListFavoritedResourcesApiResponse
): FavoritedResourcesPage => ({
  list: data.list.map(mapFavoriteItemFromApi),
  total: data.total,
  totalPage: data.totalPage,
});

export const ResourceFavoriteServicesMap = {
  mapFavoriteCollectionsFromApi,
  mapUpdateFavoriteCollectionsRequest,
  mapUpdateFavoriteCollectionRequest,
  mapListFavoritedResourcesRequest,
  mapFavoritedResourcesPageFromApi,
};
