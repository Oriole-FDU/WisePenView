import { apiGet, apiPost } from '@/apis/request';

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
  apiGet('/resource/favorite/getResourceFavoriteStatus', { params: { resourceId } });

const changeFavoriteStatus = (request: ChangeFavoriteStatusApiRequest): Promise<void> =>
  apiPost('/resource/favorite/changeResourceFavoriteStatus', request);

const listCollections = (): Promise<FavoriteCollectionApiResponse[]> =>
  apiGet('/resource/favorite/listCollections');

const createCollection = (request: CreateCollectionApiRequest): Promise<string | number> =>
  apiPost('/resource/favorite/createCollection', request);

const updateCollectionInfo = (request: UpdateCollectionInfoApiRequest): Promise<void> =>
  apiPost('/resource/favorite/updateCollectionInfo', request);

const deleteCollection = (request: DeleteCollectionApiRequest): Promise<void> =>
  apiPost('/resource/favorite/deleteCollection', request);

const listFavoritedResources = (
  request: ListFavoritedResourcesApiRequest
): Promise<ListFavoritedResourcesApiResponse> =>
  apiGet('/resource/favorite/listFavoritedResources', { params: request });

export const FavoriteApi = {
  getFavoriteStatus,
  changeFavoriteStatus,
  listCollections,
  createCollection,
  updateCollectionInfo,
  deleteCollection,
  listFavoritedResources,
};
