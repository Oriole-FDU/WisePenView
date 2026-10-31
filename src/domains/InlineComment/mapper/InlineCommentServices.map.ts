import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type {
  AddInlineCommentItemApiRequest,
  CreateInlineCommentApiRequest,
  InlineCommentApiResponse,
  InlineCommentItemApiResponse,
  InlineCommentReactionGroupApiResponse,
  InlineCommentUserDisplayApiResponse,
  ListInlineCommentsApiRequest,
  ListInlineCommentsApiResponse,
  UpdateInlineCommentItemApiRequest,
} from '../apis/InlineCommentApi.schema';
import type {
  InlineCommentAuthor,
  InlineCommentItem,
  InlineCommentReactionGroup,
  InlineCommentThread,
  InlineCommentUserDisplay,
} from '../entity/inlineComment';
import type {
  AddInlineCommentItemRequest,
  CreateInlineCommentRequest,
  ListInlineCommentsRequest,
  UpdateInlineCommentItemRequest,
} from '../service/index.type';

type InlineCommentUserReactionApiValue = NonNullable<
  InlineCommentItemApiResponse['reactions']
>[string];

function requiredTimestamp(value: number | null | undefined, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: `行内批注 ${field} 无效`,
    });
  }
  return value;
}

function optionalTimestamp(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function mapUserDisplay(
  raw: InlineCommentUserDisplayApiResponse | null | undefined,
  fallbackName?: string
): InlineCommentUserDisplay | undefined {
  const name = raw?.nickname?.trim() || raw?.realName?.trim() || fallbackName?.trim();
  if (!name) return undefined;
  return {
    name,
    avatar: raw?.avatar?.trim() || undefined,
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
  return (groups ?? []).flatMap((group) => {
    const emojiId = group.emojiId?.trim();
    if (!emojiId) return [];
    return [
      {
        emojiId,
        count: group.count ?? 0,
        reactedByCurrentUser: group.reactedByCurrentUser ?? false,
        users: (group.users ?? []).flatMap((user) => {
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
    const emojiId = reaction?.emojiId?.trim();
    if (!userId || !emojiId) return [];
    return [{ userId, emojiId, createdAt: optionalTimestamp(reaction?.createTime) }];
  });
}

function mapItem(raw: InlineCommentItemApiResponse): InlineCommentItem {
  const itemId = raw.itemId;
  const authorId = raw.authorId;
  return {
    itemId,
    authorId,
    author: mapAuthor(authorId, raw.authorInfo),
    content: raw.content ?? '',
    imageUrls: raw.imageUrls ?? [],
    mentionUserIds: raw.mentionUserIds ?? [],
    reactions: Object.entries(raw.reactions ?? {}).flatMap(([userId, reactions]) =>
      mapUserReactions(userId, reactions)
    ),
    reactionGroups: mapReactionGroups(raw.reactionGroups),
    createdAt: requiredTimestamp(raw.createTime, 'item.createTime'),
    updatedAt: requiredTimestamp(raw.updateTime, 'item.updateTime'),
  };
}

function mapThread(raw: InlineCommentApiResponse): InlineCommentThread {
  const inlineCommentId = raw.inlineCommentId;
  const resourceId = raw.resourceId;
  const creatorId = raw.creatorId;
  const resolvedBy = raw.resolvedBy ?? undefined;
  return {
    inlineCommentId,
    resourceId,
    applicableFromVersion: raw.applicableFromVersion ?? undefined,
    applicableToVersion: raw.applicableToVersion ?? undefined,
    creatorId,
    creator: mapAuthor(creatorId, raw.creatorInfo),
    anchor: {
      externalAnchorId: raw.anchorRef?.externalAnchorId?.trim() ?? '',
      quoteText: raw.anchorRef?.quoteText ?? '',
      anchorPayload: raw.anchorRef?.anchorPayload ?? {},
    },
    items: (raw.items ?? []).map(mapItem),
    resolved: raw.resolved ?? false,
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

const mapListFromApi = (data: ListInlineCommentsApiResponse): InlineCommentThread[] =>
  data.map(mapThread);

export const InlineCommentServicesMap = {
  mapListRequest,
  mapCreateRequest,
  mapAddItemRequest,
  mapUpdateItemRequest,
  mapListFromApi,
};
