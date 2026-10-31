import { FavoriteApi } from '@domain-apis';

import { ResourceFavoriteServicesMap } from '../mapper/ResourceFavoriteServices.map';
import type { IResourceFavoriteService } from './index.type';

const getFavoriteCollectionIds = async (resourceId: string) =>
  ResourceFavoriteServicesMap.mapFavoriteCollectionIdsFromApi(
    await FavoriteApi.getFavoriteStatus(resourceId)
  );

const updateFavoriteCollections: IResourceFavoriteService['updateFavoriteCollections'] = (params) =>
  FavoriteApi.changeFavoriteStatus(
    ResourceFavoriteServicesMap.mapUpdateFavoriteCollectionsRequest(params)
  );

const listFavoriteCollections = async () =>
  ResourceFavoriteServicesMap.mapFavoriteCollectionsFromApi(await FavoriteApi.listCollections());

const createFavoriteCollection = async (
  params: Parameters<IResourceFavoriteService['createFavoriteCollection']>[0]
): Promise<string> =>
  ResourceFavoriteServicesMap.mapCollectionIdFromApi(
    await FavoriteApi.createCollection(
      ResourceFavoriteServicesMap.mapCreateFavoriteCollectionRequest(params)
    )
  );

const updateFavoriteCollection: IResourceFavoriteService['updateFavoriteCollection'] = (params) =>
  FavoriteApi.updateCollectionInfo(
    ResourceFavoriteServicesMap.mapUpdateFavoriteCollectionRequest(params)
  );

const deleteFavoriteCollection: IResourceFavoriteService['deleteFavoriteCollection'] = (params) =>
  FavoriteApi.deleteCollection(
    ResourceFavoriteServicesMap.mapDeleteFavoriteCollectionRequest(params)
  );

const listFavoritedResources: IResourceFavoriteService['listFavoritedResources'] = async (params) =>
  ResourceFavoriteServicesMap.mapFavoritedResourcesPageFromApi(
    await FavoriteApi.listFavoritedResources(
      ResourceFavoriteServicesMap.mapListFavoritedResourcesRequest(params)
    )
  );

export const createResourceFavoriteServices = (): IResourceFavoriteService => ({
  getFavoriteCollectionIds,
  updateFavoriteCollections,
  listFavoriteCollections,
  createFavoriteCollection,
  updateFavoriteCollection,
  deleteFavoriteCollection,
  listFavoritedResources,
});
