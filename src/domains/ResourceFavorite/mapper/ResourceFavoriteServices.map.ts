import { ResourceServicesMap } from '@/domains/Resource';

import type {
  ChangeFavoriteStatusApiRequest,
  CreateCollectionApiRequest,
  DeleteCollectionApiRequest,
  FavoriteCollectionApiResponse,
  FavoriteItemApiResponse,
  GetFavoriteStatusApiResponse,
  ListFavoritedResourcesApiRequest,
  ListFavoritedResourcesApiResponse,
  UpdateCollectionInfoApiRequest,
} from '../apis/FavoriteApi.schema';
import type { FavoriteCollection, FavoritedResourcesPage, FavoriteItem } from '../entity/favorite';
import type {
  CreateFavoriteCollectionRequest,
  DeleteFavoriteCollectionRequest,
  ListFavoritedResourcesRequest,
  UpdateFavoriteCollectionRequest,
  UpdateFavoriteCollectionsRequest,
} from '../service/index.type';

const mapFavoriteCollectionIdsFromApi = (data: GetFavoriteStatusApiResponse): string[] => [
  ...data.collectionIds,
];

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

const mapCreateFavoriteCollectionRequest = (
  params: CreateFavoriteCollectionRequest
): CreateCollectionApiRequest => ({
  collectionName: params.collectionName,
  ...(params.description !== undefined ? { description: params.description } : {}),
});

const mapUpdateFavoriteCollectionRequest = (
  params: UpdateFavoriteCollectionRequest
): UpdateCollectionInfoApiRequest => ({
  collectionId: params.collectionId,
  collectionName: params.collectionName,
  description: params.description ?? null,
});

const mapDeleteFavoriteCollectionRequest = (
  params: DeleteFavoriteCollectionRequest
): DeleteCollectionApiRequest => ({
  collectionId: params.collectionId,
  keepResourcesToDefault: params.keepResourcesToDefault,
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
  mapFavoriteCollectionIdsFromApi,
  mapFavoriteCollectionsFromApi,
  mapUpdateFavoriteCollectionsRequest,
  mapCreateFavoriteCollectionRequest,
  mapUpdateFavoriteCollectionRequest,
  mapDeleteFavoriteCollectionRequest,
  mapListFavoritedResourcesRequest,
  mapFavoritedResourcesPageFromApi,
};
