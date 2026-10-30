import type { CommentPage, CommentSortBy } from '../entity/comment';
import type { FavoriteCollection, FavoritedResourcesPage } from '../entity/favorite';
import type { ResourceInteractionRecord } from '../entity/interaction';

export interface IInteractService {
  getResourceInteraction(resourceId: string): Promise<ResourceInteractionRecord>;
  toggleResourceLike(resourceId: string): Promise<void>;
  rateResource(params: RateResourceRequest): Promise<void>;
  recordResourceRead(resourceId: string): Promise<void>;
  listComments(params: ListCommentsRequest): Promise<CommentPage>;
  listReplies(params: ListRepliesRequest): Promise<CommentPage>;
  createComment(params: CreateCommentRequest): Promise<string>;
  createReply(params: CreateReplyRequest): Promise<string>;
  deleteComment(params: CommentItemActionRequest): Promise<void>;
  toggleCommentLike(params: CommentItemActionRequest): Promise<boolean>;
  getFavoriteCollectionIds(resourceId: string): Promise<string[]>;
  updateFavoriteCollections(params: UpdateFavoriteCollectionsRequest): Promise<void>;
  listFavoriteCollections(): Promise<FavoriteCollection[]>;
  createFavoriteCollection(params: CreateFavoriteCollectionRequest): Promise<string>;
  updateFavoriteCollection(params: UpdateFavoriteCollectionRequest): Promise<void>;
  deleteFavoriteCollection(params: DeleteFavoriteCollectionRequest): Promise<void>;
  listFavoritedResources(params: ListFavoritedResourcesRequest): Promise<FavoritedResourcesPage>;
}

export interface RateResourceRequest {
  resourceId: string;
  score: number;
}

export interface ListCommentsRequest {
  resourceId: string;
  sortBy: CommentSortBy;
  page: number;
  size: number;
}

export interface ListRepliesRequest {
  rootCommentId: string;
  page: number;
  size: number;
}

export interface CreateCommentRequest {
  resourceId: string;
  content: string;
  imageUrls?: string[];
}

export interface CreateReplyRequest extends CreateCommentRequest {
  replyTo: string;
}

export interface CommentItemActionRequest {
  resourceId: string;
  commentId: string;
}

export interface UpdateFavoriteCollectionsRequest {
  resourceId: string;
  collectionIds: string[];
}

export interface CreateFavoriteCollectionRequest {
  collectionName: string;
  description?: string | null;
}

export interface UpdateFavoriteCollectionRequest {
  collectionId: string;
  collectionName: string;
  description?: string | null;
}

export interface DeleteFavoriteCollectionRequest {
  collectionId: string;
  keepResourcesToDefault?: boolean;
}

export interface ListFavoritedResourcesRequest {
  collectionId?: string;
  page: number;
  size: number;
}
