export type { CommentAuthor, CommentPage, CommentSortBy, ResourceComment } from './entity/comment';
export type { FavoriteCollection, FavoritedResourcesPage, FavoriteItem } from './entity/favorite';
export type { ResourceInteractionRecord } from './entity/interaction';
export type {
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
} from './service/index.type';
