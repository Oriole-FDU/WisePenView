import {
  assertApiArray,
  assertApiRecord,
  invalidApiResponse,
  isRecord,
  optionalApiBoolean,
  optionalApiNumber,
  optionalApiString,
  optionalApiStrings,
} from '@/apis/runtimeContract';
import { normalizeId } from '@/utils/normalize/normalizeId';

import type {
  AddInlineCommentItemApiRequest,
  ChangeInlineCommentResolveStatusApiRequest,
  CreateInlineCommentApiRequest,
  DeleteInlineCommentItemApiRequest,
  DeleteInlineCommentItemReactionApiRequest,
  InlineCommentApiResponse,
  InlineCommentItemApiResponse,
  InlineCommentReactionGroupApiResponse,
  InlineCommentUserDisplayApiResponse,
  ListInlineCommentsApiRequest,
  ListInlineCommentsApiResponse,
  SetInlineCommentItemReactionApiRequest,
  UpdateInlineCommentItemApiRequest,
} from '../apis/InlineCommentApi.type';
import type {
  InlineCommentAuthor,
  InlineCommentItem,
  InlineCommentReactionGroup,
  InlineCommentThread,
  InlineCommentUserDisplay,
} from '../entity/inlineComment';
import type {
  AddInlineCommentItemRequest,
  ChangeInlineCommentResolveStatusRequest,
  CreateInlineCommentRequest,
  DeleteInlineCommentItemReactionRequest,
  DeleteInlineCommentItemRequest,
  ListInlineCommentsRequest,
  SetInlineCommentItemReactionRequest,
  UpdateInlineCommentItemRequest,
} from '../service/index.type';

type InlineCommentUserReactionApiValue = NonNullable<
  InlineCommentItemApiResponse['reactions']
>[string];

function requiredId(value: string | null | undefined, field: string): string {
  if (typeof value !== 'string') invalidApiResponse(`行内批注 ${field} 无效`);
  const id = normalizeId(value);
  if (!id) {
    invalidApiResponse(`行内批注 ${field} 缺失`);
  }
  return id;
}

function requiredTimestamp(value: number | null | undefined, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    invalidApiResponse(`行内批注 ${field} 无效`);
  }
  return value as number;
}

function optionalTimestamp(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function mapUserDisplay(
  raw: InlineCommentUserDisplayApiResponse | null | undefined,
  fallbackName?: string
): InlineCommentUserDisplay | undefined {
  const name =
    optionalApiString(raw?.nickname)?.trim() ||
    optionalApiString(raw?.realName)?.trim() ||
    fallbackName?.trim();
  if (!name) return undefined;
  return {
    name,
    avatar: optionalApiString(raw?.avatar)?.trim() || undefined,
  };
}

function mapAuthor(
  authorId: string,
  raw: InlineCommentUserDisplayApiResponse | null | undefined
): InlineCommentAuthor {
  // 后端允许用户信息服务降级，缺少展示信息时仍以 authorId 保证批注可渲染。
  return {
    id: authorId,
    ...(mapUserDisplay(raw, authorId) ?? { name: authorId }),
  };
}

function mapReactionGroups(
  groups: InlineCommentReactionGroupApiResponse[] | null | undefined
): InlineCommentReactionGroup[] {
  return (Array.isArray(groups) ? groups : []).filter(isRecord).flatMap((group) => {
    const emojiId = optionalApiString(group.emojiId)?.trim();
    if (!emojiId) return [];
    return [
      {
        emojiId,
        count: optionalApiNumber(group.count) ?? 0,
        reactedByCurrentUser: optionalApiBoolean(group.reactedByCurrentUser) ?? false,
        users: (Array.isArray(group.users) ? group.users : []).flatMap((user) => {
          const display = mapUserDisplay(user);
          return display ? [display] : [];
        }),
      },
    ];
  });
}

function mapUserReactions(
  userId: string,
  reactions: InlineCommentUserReactionApiValue | null | undefined
): InlineCommentItem['reactions'] {
  return (Array.isArray(reactions) ? reactions : [reactions]).flatMap((reaction) => {
    const emojiId = optionalApiString(reaction?.emojiId)?.trim();
    if (!userId || !emojiId) return [];
    return [{ userId, emojiId, createdAt: optionalTimestamp(reaction?.createTime) }];
  });
}

function mapItem(raw: InlineCommentItemApiResponse): InlineCommentItem {
  assertApiRecord(raw, '行内批注项目契约无效');
  const itemId = requiredId(raw.itemId, 'itemId');
  const authorId = requiredId(raw.authorId, 'authorId');
  return {
    itemId,
    authorId,
    author: mapAuthor(authorId, raw.authorInfo),
    content: optionalApiString(raw.content) ?? '',
    imageUrls: optionalApiStrings(raw.imageUrls) ?? [],
    mentionUserIds: optionalApiStrings(raw.mentionUserIds) ?? [],
    reactions: Object.entries(isRecord(raw.reactions) ? raw.reactions : {}).flatMap(
      ([userId, reactions]) => mapUserReactions(userId, reactions)
    ),
    reactionGroups: mapReactionGroups(raw.reactionGroups),
    createdAt: requiredTimestamp(raw.createTime, 'item.createTime'),
    updatedAt: requiredTimestamp(raw.updateTime, 'item.updateTime'),
  };
}

function mapThread(raw: InlineCommentApiResponse): InlineCommentThread {
  assertApiRecord(raw, '行内批注契约无效');
  assertApiArray(raw.items, isRecord, '行内批注项目列表契约无效');
  const inlineCommentId = requiredId(raw.inlineCommentId, 'inlineCommentId');
  const resourceId = requiredId(raw.resourceId, 'resourceId');
  const creatorId = requiredId(raw.creatorId, 'creatorId');
  const resolvedBy = normalizeId(optionalApiString(raw.resolvedBy)) || undefined;
  return {
    inlineCommentId,
    resourceId,
    applicableFromVersion: optionalApiNumber(raw.applicableFromVersion) ?? undefined,
    applicableToVersion: optionalApiNumber(raw.applicableToVersion) ?? undefined,
    creatorId,
    creator: mapAuthor(creatorId, raw.creatorInfo),
    anchor: {
      externalAnchorId: optionalApiString(raw.anchorRef?.externalAnchorId)?.trim() ?? '',
      quoteText: optionalApiString(raw.anchorRef?.quoteText) ?? '',
      anchorPayload: isRecord(raw.anchorRef?.anchorPayload) ? raw.anchorRef.anchorPayload : {},
    },
    items: (raw.items ?? []).map(mapItem),
    resolved: optionalApiBoolean(raw.resolved) ?? false,
    resolvedBy,
    resolvedByUser: resolvedBy ? mapAuthor(resolvedBy, raw.resolvedByInfo) : undefined,
    resolvedAt: optionalTimestamp(raw.resolvedAt),
    createdAt: requiredTimestamp(raw.createTime, 'createTime'),
    updatedAt: requiredTimestamp(raw.updateTime, 'updateTime'),
  };
}

const mapListRequest = (params: ListInlineCommentsRequest): ListInlineCommentsApiRequest => ({
  resourceId: params.resourceId,
  ...(params.contentVersion != null ? { contentVersion: params.contentVersion } : {}),
  ...(params.resolved != null ? { resolved: params.resolved } : {}),
});

const mapCreateRequest = (params: CreateInlineCommentRequest): CreateInlineCommentApiRequest => ({
  resourceId: params.resourceId,
  externalAnchorId: params.externalAnchorId,
  content: params.content,
  imageUrls: params.imageUrls ?? [],
  mentionUserIds: params.mentionUserIds ?? [],
  ...(params.quoteText != null ? { quoteText: params.quoteText } : {}),
  ...(params.anchorPayload ? { anchorPayload: params.anchorPayload } : {}),
  ...(params.contentVersion != null ? { contentVersion: params.contentVersion } : {}),
  ...(params.applicableFromVersion != null
    ? { applicableFromVersion: params.applicableFromVersion }
    : {}),
  ...(params.applicableToVersion != null
    ? { applicableToVersion: params.applicableToVersion }
    : {}),
});

const mapAddItemRequest = (
  params: AddInlineCommentItemRequest
): AddInlineCommentItemApiRequest => ({
  resourceId: params.resourceId,
  inlineCommentId: params.inlineCommentId,
  content: params.content,
  imageUrls: params.imageUrls ?? [],
  mentionUserIds: params.mentionUserIds ?? [],
  ...(params.contentVersion != null ? { contentVersion: params.contentVersion } : {}),
});

const mapUpdateItemRequest = (
  params: UpdateInlineCommentItemRequest
): UpdateInlineCommentItemApiRequest => ({
  ...mapAddItemRequest(params),
  itemId: params.itemId,
});

const mapSetReactionRequest = (
  params: SetInlineCommentItemReactionRequest
): SetInlineCommentItemReactionApiRequest => ({ ...params });

const mapDeleteReactionRequest = (
  params: DeleteInlineCommentItemReactionRequest
): DeleteInlineCommentItemReactionApiRequest => ({ ...params });

const mapDeleteItemRequest = (
  params: DeleteInlineCommentItemRequest
): DeleteInlineCommentItemApiRequest => ({ ...params });

const mapResolveRequest = (
  params: ChangeInlineCommentResolveStatusRequest
): ChangeInlineCommentResolveStatusApiRequest => ({ ...params });

const mapListFromApi = (data: ListInlineCommentsApiResponse): InlineCommentThread[] => {
  assertApiArray(data, isRecord, '行内批注列表响应契约无效');
  return data.map(mapThread);
};

const mapCreatedId = (value: string, field: string): string => requiredId(value, field);

export const InlineCommentServicesMap = {
  mapListRequest,
  mapCreateRequest,
  mapAddItemRequest,
  mapUpdateItemRequest,
  mapSetReactionRequest,
  mapDeleteReactionRequest,
  mapDeleteItemRequest,
  mapResolveRequest,
  mapListFromApi,
  mapCreatedId,
};
