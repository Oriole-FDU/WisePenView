import {
  assertApiArray,
  assertApiPage,
  assertApiRecord,
  invalidApiResponse,
  isApiId,
  isRecord,
  optionalApiBoolean,
  optionalApiNumber,
  optionalApiString,
  optionalApiStrings,
} from '@/apis/runtimeContract';
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

const isCommentItemResponse = (value: unknown): value is ResourceCommentItemApiResponse =>
  isRecord(value) &&
  typeof value.commentId === 'string' &&
  typeof value.authorId === 'string' &&
  typeof value.createTime === 'number';

function mapCommentAuthorFromApi(
  value: ResourceCommentItemApiResponse['authorInfo'],
  fallbackId: string
): CommentAuthor {
  return {
    name:
      optionalApiString(value?.realName)?.trim() ||
      optionalApiString(value?.nickname)?.trim() ||
      fallbackId,
    avatar: optionalApiString(value?.avatar)?.trim() || undefined,
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
    content: optionalApiString(data.content) ?? '',
    imageUrls: optionalApiStrings(data.imageUrls) ?? [],
    likeCount: optionalApiNumber(data.likeCount) ?? 0,
    replyCount: optionalApiNumber(data.replyCount) ?? 0,
    createTime: data.createTime,
    deleted: optionalApiBoolean(data.deleted) ?? false,
  };
}

const mapCommentPageFromApi = (data: CommentPageApiResponse): CommentPage => {
  const page = assertApiPage(data, isCommentItemResponse, '评论分页响应契约无效');
  return { items: page.list.map(mapCommentFromApi), total: page.total, totalPage: page.totalPage };
};

const mapResourceInteractionRecordFromApi = (
  data: GetUserInteractionRecordApiResponse | null | undefined
): ResourceInteractionRecord => ({
  liked: optionalApiBoolean(data?.liked) ?? false,
  score: optionalApiNumber(data?.score) ?? 0,
  likedCommentIds: new Set(optionalApiStrings(data?.likedCommentIds) ?? []),
});

const mapFavoriteCollectionIdsFromApi = (data: GetFavoriteStatusApiResponse): string[] => {
  if (
    !isRecord(data) ||
    !Array.isArray(data.collectionIds) ||
    !data.collectionIds.every((id) => typeof id === 'string' || typeof id === 'number')
  )
    invalidApiResponse('收藏状态响应契约无效');
  return data.collectionIds.map(normalizeId).filter(Boolean);
};

const mapFavoriteCollectionFromApi = (data: FavoriteCollectionApiResponse): FavoriteCollection => {
  if (!isRecord(data) || !isApiId(data.collectionId)) invalidApiResponse('收藏夹响应契约无效');
  return {
    collectionId: normalizeId(data.collectionId),
    collectionName: optionalApiString(data.collectionName) ?? null,
    description: optionalApiString(data.description) ?? null,
    isDefault: optionalApiBoolean(data.isDefault) ?? false,
    itemCount: optionalApiNumber(data.itemCount) ?? 0,
  };
};

const mapFavoriteCollectionsFromApi = (
  data: FavoriteCollectionApiResponse[]
): FavoriteCollection[] => {
  assertApiArray(data, isRecord, '收藏夹列表响应契约无效');
  return data.map(mapFavoriteCollectionFromApi);
};

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
  assertApiRecord(data, '收藏资源契约无效');
  if (!isApiId(data.resourceId)) invalidApiResponse('收藏资源标识契约无效');
  const normalizedResource = data.resourceInfo
    ? ResourceServicesMap.mapResourceItemFromApi(data.resourceInfo)
    : null;
  const accessible = optionalApiBoolean(data.accessible) ?? normalizedResource != null;
  const resourceInfo = accessible ? normalizedResource : null;
  return {
    resourceId: normalizeId(data.resourceId) || resourceInfo?.resourceId || '',
    favoritedAt: normalizeTimestamp(data.favoritedAt),
    resourceInfo,
  };
};

const mapFavoritedResourcesPageFromApi = (
  data: ListFavoritedResourcesApiResponse
): FavoritedResourcesPage => {
  const page = assertApiPage(data, isRecord, '收藏资源分页响应契约无效');
  return {
    list: page.list.map(mapFavoriteItemFromApi),
    total: page.total,
    totalPage: page.totalPage,
  };
};

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
