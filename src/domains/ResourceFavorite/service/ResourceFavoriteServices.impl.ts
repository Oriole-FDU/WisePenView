import { FavoriteApi } from '@domain-apis';

import { ResourceFavoriteServicesMap } from '../mapper/ResourceFavoriteServices.map';
import type { IResourceFavoriteService } from './index.type';

const getFavoriteCollectionIds = async (resourceId: string) =>
  (await FavoriteApi.getFavoriteStatus(resourceId)).collectionIds;

const updateFavoriteCollections: IResourceFavoriteService['updateFavoriteCollections'] = (params) =>
  FavoriteApi.changeFavoriteStatus(
    ResourceFavoriteServicesMap.mapUpdateFavoriteCollectionsRequest(params)
  );

const listFavoriteCollections = async () =>
  ResourceFavoriteServicesMap.mapFavoriteCollectionsFromApi(await FavoriteApi.listCollections());

const createFavoriteCollection = async (
  params: Parameters<IResourceFavoriteService['createFavoriteCollection']>[0]
): Promise<string> => FavoriteApi.createCollection(params);

const updateFavoriteCollection: IResourceFavoriteService['updateFavoriteCollection'] = (params) =>
  FavoriteApi.updateCollectionInfo(
    ResourceFavoriteServicesMap.mapUpdateFavoriteCollectionRequest(params)
  );

const deleteFavoriteCollection: IResourceFavoriteService['deleteFavoriteCollection'] = (params) =>
  FavoriteApi.deleteCollection(params);

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
