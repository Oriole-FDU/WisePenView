import { CommentApi, FavoriteApi, InteractApi } from '@domain-apis';
import { InteractServicesMap } from '../mapper/InteractServices.map';
import type {
  CommentItemActionRequest,
  CreateCommentRequest,
  CreateFavoriteCollectionRequest,
  CreateReplyRequest,
  DeleteFavoriteCollectionRequest,
  IInteractService,
  ListCommentsRequest,
  ListFavoritedResourcesRequest,
  ListRepliesRequest,
  RateResourceRequest,
  UpdateFavoriteCollectionRequest,
  UpdateFavoriteCollectionsRequest,
} from './index.type';

async function getResourceInteraction(resourceId: string) {
  const data = await InteractApi.getUserInteractionRecord({ resourceId });
  return InteractServicesMap.mapResourceInteractionRecordFromApi(data);
}

async function setResourceLike(resourceId: string, liked: boolean): Promise<void> {
  await InteractApi.setLike({ resourceId, liked });
}

async function rateResource(params: RateResourceRequest): Promise<void> {
  await InteractApi.rate(params);
}

async function recordResourceRead(resourceId: string): Promise<void> {
  await InteractApi.read({ resourceId });
}

async function listComments(params: ListCommentsRequest) {
  return InteractServicesMap.mapCommentPageFromApi(await CommentApi.listComments(params));
}

async function listReplies(params: ListRepliesRequest) {
  return InteractServicesMap.mapCommentPageFromApi(await CommentApi.listReplies(params));
}

function createComment(params: CreateCommentRequest): Promise<string> {
  return CommentApi.createComment({ ...params, imageUrls: params.imageUrls ?? [] });
}

function createReply(params: CreateReplyRequest): Promise<string> {
  return CommentApi.createReply({ ...params, imageUrls: params.imageUrls ?? [] });
}

function deleteComment(params: CommentItemActionRequest): Promise<void> {
  return CommentApi.deleteCommentItem(params);
}

function toggleCommentLike(params: CommentItemActionRequest): Promise<boolean> {
  return CommentApi.toggleLike(params);
}

const getFavoriteCollectionIds = async (resourceId: string) =>
  InteractServicesMap.mapFavoriteCollectionIdsFromApi(
    await FavoriteApi.getFavoriteStatus(resourceId)
  );

const updateFavoriteCollections = (params: UpdateFavoriteCollectionsRequest): Promise<void> =>
  FavoriteApi.changeFavoriteStatus(InteractServicesMap.mapUpdateFavoriteCollectionsRequest(params));

const listFavoriteCollections = async () =>
  InteractServicesMap.mapFavoriteCollectionsFromApi(await FavoriteApi.listCollections());

const createFavoriteCollection = async (params: CreateFavoriteCollectionRequest): Promise<string> =>
  InteractServicesMap.mapCollectionIdFromApi(
    await FavoriteApi.createCollection(
      InteractServicesMap.mapCreateFavoriteCollectionRequest(params)
    )
  );

const updateFavoriteCollection = (params: UpdateFavoriteCollectionRequest): Promise<void> =>
  FavoriteApi.updateCollectionInfo(InteractServicesMap.mapUpdateFavoriteCollectionRequest(params));

const deleteFavoriteCollection = (params: DeleteFavoriteCollectionRequest): Promise<void> =>
  FavoriteApi.deleteCollection(InteractServicesMap.mapDeleteFavoriteCollectionRequest(params));

const listFavoritedResources = async (params: ListFavoritedResourcesRequest) =>
  InteractServicesMap.mapFavoritedResourcesPageFromApi(
    await FavoriteApi.listFavoritedResources(
      InteractServicesMap.mapListFavoritedResourcesRequest(params)
    )
  );

export const createInteractServices = (): IInteractService => ({
  getResourceInteraction,
  setResourceLike,
  rateResource,
  recordResourceRead,
  listComments,
  listReplies,
  createComment,
  createReply,
  deleteComment,
  toggleCommentLike,
  getFavoriteCollectionIds,
  updateFavoriteCollections,
  listFavoriteCollections,
  createFavoriteCollection,
  updateFavoriteCollection,
  deleteFavoriteCollection,
  listFavoritedResources,
});
