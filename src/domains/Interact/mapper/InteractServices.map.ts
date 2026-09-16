import { ResourceServicesMap } from '@/domains/Resource/mapper/ResourceServices.map';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { normalizeFiniteNumber } from '@/utils/normalize/normalizeNumber';

import type {
  CommentPageApiResponse,
  ResourceCommentItemApiResponse,
} from '../apis/CommentApi.type';
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
} from '../apis/FavoriteApi.type';
import type { GetUserInteractionRecordApiResponse } from '../apis/InteractApi.type';
import type { CommentAuthor, CommentPage, ResourceComment } from '../entity/comment';
import type { FavoriteCollection, FavoritedResourcesPage, FavoriteItem } from '../entity/favorite';
import type { ResourceInteractionRecord } from '../entity/interaction';
import type {
  CreateFavoriteCollectionRequest,
  DeleteFavoriteCollectionRequest,
  ListFavoritedResourcesRequest,
  UpdateFavoriteCollectionRequest,
  UpdateFavoriteCollectionsRequest,
} from '../service/index.type';

const normalizeTimestamp = (value: number | string | undefined): number =>
  normalizeFiniteNumber(value) ?? 0;

function mapCommentAuthorFromApi(
  value: ResourceCommentItemApiResponse['authorInfo'],
  fallbackId: string
): CommentAuthor {
  return {
    name: value?.realName?.trim() || value?.nickname?.trim() || fallbackId,
    avatar: value?.avatar?.trim() || undefined,
  };
}

function mapCommentFromApi(data: ResourceCommentItemApiResponse): ResourceComment {
  return {
    commentId: data.commentId,
    authorId: data.authorId,
    author: mapCommentAuthorFromApi(data.authorInfo, data.authorId),
    replyToUser: data.replyToUserId
      ? mapCommentAuthorFromApi(data.replyToUserInfo, data.replyToUserId)
      : undefined,
    content: data.content ?? '',
    imageUrls: data.imageUrls ?? [],
    likeCount: data.likeCount ?? 0,
    replyCount: data.replyCount ?? 0,
    createTime: data.createTime,
    deleted: data.deleted ?? false,
  };
}

const mapCommentPageFromApi = (data: CommentPageApiResponse): CommentPage => ({
  items: data.list.map(mapCommentFromApi),
  total: data.total,
  totalPage: data.totalPage,
});

const mapResourceInteractionRecordFromApi = (
  data: GetUserInteractionRecordApiResponse | null | undefined
): ResourceInteractionRecord => ({
  liked: data?.liked ?? false,
  score: data?.score ?? 0,
  likedCommentIds: new Set(data?.likedCommentIds ?? []),
});

const mapFavoriteCollectionIdsFromApi = (data: GetFavoriteStatusApiResponse): string[] =>
  (data.collectionIds ?? []).map(normalizeId).filter(Boolean);

const mapFavoriteCollectionFromApi = (data: FavoriteCollectionApiResponse): FavoriteCollection => ({
  collectionId: normalizeId(data.collectionId),
  collectionName: data.collectionName ?? null,
  description: data.description ?? null,
  isDefault: data.isDefault ?? false,
  itemCount: data.itemCount ?? 0,
});

const mapFavoriteCollectionsFromApi = (
  data: FavoriteCollectionApiResponse[]
): FavoriteCollection[] => data.map(mapFavoriteCollectionFromApi);

const mapUpdateFavoriteCollectionsRequest = (
  params: UpdateFavoriteCollectionsRequest
): ChangeFavoriteStatusApiRequest => {
  const collectionIds = params.collectionIds.map(normalizeId).filter(Boolean);
  return {
    resourceId: normalizeId(params.resourceId),
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
  collectionId: normalizeId(params.collectionId),
  collectionName: params.collectionName,
  ...(params.description !== undefined ? { description: params.description } : {}),
});

const mapDeleteFavoriteCollectionRequest = (
  params: DeleteFavoriteCollectionRequest
): DeleteCollectionApiRequest => ({
  collectionId: normalizeId(params.collectionId),
  keepResourcesToDefault: params.keepResourcesToDefault,
});

const mapListFavoritedResourcesRequest = (
  params: ListFavoritedResourcesRequest
): ListFavoritedResourcesApiRequest => ({
  ...(params.collectionId ? { collectionId: normalizeId(params.collectionId) } : {}),
  page: params.page,
  size: params.size,
});

const mapFavoriteItemFromApi = (data: FavoriteItemApiResponse): FavoriteItem => {
  const normalizedResource = data.resourceInfo
    ? ResourceServicesMap.mapResourceItemFromApi(data.resourceInfo)
    : null;
  const accessible = data.accessible ?? normalizedResource != null;
  const resourceInfo = accessible ? normalizedResource : null;
  return {
    resourceId: normalizeId(data.resourceId) || resourceInfo?.resourceId || '',
    favoritedAt: normalizeTimestamp(data.favoritedAt),
    resourceInfo,
  };
};

const mapFavoritedResourcesPageFromApi = (
  data: ListFavoritedResourcesApiResponse
): FavoritedResourcesPage => ({
  list: (data.list ?? []).map(mapFavoriteItemFromApi),
  total: Number(data.total) || 0,
  totalPage: data.totalPage,
});

export const InteractServicesMap = {
  mapCommentPageFromApi,
  mapResourceInteractionRecordFromApi,
  mapFavoriteCollectionIdsFromApi,
  mapFavoriteCollectionsFromApi,
  mapUpdateFavoriteCollectionsRequest,
  mapCreateFavoriteCollectionRequest,
  mapUpdateFavoriteCollectionRequest,
  mapDeleteFavoriteCollectionRequest,
  mapListFavoritedResourcesRequest,
  mapFavoritedResourcesPageFromApi,
  mapCollectionIdFromApi: normalizeId,
};
