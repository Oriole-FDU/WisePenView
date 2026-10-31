import { executeApiContract } from '@/apis/executeApiContract';

import {
  ChangeFavoriteStatusApiContract,
  type ChangeFavoriteStatusApiContractRequest,
  CreateCollectionApiContract,
  type CreateCollectionApiContractRequest,
  type CreateCollectionApiContractResponse,
  DeleteCollectionApiContract,
  type DeleteCollectionApiContractRequest,
  GetFavoriteStatusApiContract,
  type GetFavoriteStatusApiContractResponse,
  ListFavoriteCollectionsApiContract,
  type ListFavoriteCollectionsApiContractResponse,
  ListFavoritedResourcesApiContract,
  type ListFavoritedResourcesApiContractRequest,
  type ListFavoritedResourcesApiContractResponse,
  UpdateCollectionInfoApiContract,
  type UpdateCollectionInfoApiContractRequest,
} from './FavoriteApi.contract';

const getFavoriteStatus = (resourceId: string): Promise<GetFavoriteStatusApiContractResponse> =>
  executeApiContract(GetFavoriteStatusApiContract, { resourceId });

const changeFavoriteStatus = async (
  request: ChangeFavoriteStatusApiContractRequest
): Promise<void> => {
  await executeApiContract(ChangeFavoriteStatusApiContract, request);
};

const listCollections = (): Promise<ListFavoriteCollectionsApiContractResponse> =>
  executeApiContract(ListFavoriteCollectionsApiContract, undefined);

const createCollection = (
  request: CreateCollectionApiContractRequest
): Promise<CreateCollectionApiContractResponse> =>
  executeApiContract(CreateCollectionApiContract, request);

const updateCollectionInfo = async (
  request: UpdateCollectionInfoApiContractRequest
): Promise<void> => {
  await executeApiContract(UpdateCollectionInfoApiContract, request);
};

const deleteCollection = async (request: DeleteCollectionApiContractRequest): Promise<void> => {
  await executeApiContract(DeleteCollectionApiContract, request);
};

const listFavoritedResources = (
  request: ListFavoritedResourcesApiContractRequest
): Promise<ListFavoritedResourcesApiContractResponse> =>
  executeApiContract(ListFavoritedResourcesApiContract, request);

export const FavoriteApi = {
  getFavoriteStatus,
  changeFavoriteStatus,
  listCollections,
  createCollection,
  updateCollectionInfo,
  deleteCollection,
  listFavoritedResources,
};
