import { apiGetUnchecked, apiPostUnchecked } from '@/apis/request';

import type {
  ChangeFavoriteStatusApiRequest,
  CreateCollectionApiRequest,
  DeleteCollectionApiRequest,
  FavoriteCollectionApiResponse,
  GetFavoriteStatusApiResponse,
  ListFavoritedResourcesApiRequest,
  ListFavoritedResourcesApiResponse,
  UpdateCollectionInfoApiRequest,
} from './FavoriteApi.type';

const getFavoriteStatus = (resourceId: string): Promise<GetFavoriteStatusApiResponse> =>
  apiGetUnchecked('/resource/favorite/getResourceFavoriteStatus', {
    params: { resourceId },
  });

const changeFavoriteStatus = (request: ChangeFavoriteStatusApiRequest): Promise<void> =>
  apiPostUnchecked('/resource/favorite/changeResourceFavoriteStatus', request);

const listCollections = (): Promise<FavoriteCollectionApiResponse[]> =>
  apiGetUnchecked('/resource/favorite/listCollections');

const createCollection = (request: CreateCollectionApiRequest): Promise<string | number> =>
  apiPostUnchecked('/resource/favorite/createCollection', request);

const updateCollectionInfo = (request: UpdateCollectionInfoApiRequest): Promise<void> =>
  apiPostUnchecked('/resource/favorite/updateCollectionInfo', request);

const deleteCollection = (request: DeleteCollectionApiRequest): Promise<void> =>
  apiPostUnchecked('/resource/favorite/deleteCollection', request);

const listFavoritedResources = (
  request: ListFavoritedResourcesApiRequest
): Promise<ListFavoritedResourcesApiResponse> =>
  apiGetUnchecked('/resource/favorite/listFavoritedResources', { params: request });

export const FavoriteApi = {
  getFavoriteStatus,
  changeFavoriteStatus,
  listCollections,
  createCollection,
  updateCollectionInfo,
  deleteCollection,
  listFavoritedResources,
};
