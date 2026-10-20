import type { UserDisplayBaseApiResponse } from '@/domains/User/apis/UserApi.type';

export type InlineCommentUserDisplayApiResponse = UserDisplayBaseApiResponse;

export interface InlineCommentAnchorRefApiResponse {
  externalAnchorId: string;
  quoteText: string;
  anchorPayload: Record<string, unknown>;
}

export interface InlineCommentReactionApiResponse {
  emojiId: string;
  createTime: number;
}

export interface InlineCommentReactionGroupApiResponse {
  emojiId: string;
  count: number;
  reactedByCurrentUser: boolean;
  users: InlineCommentUserDisplayApiResponse[];
}

export interface InlineCommentItemApiResponse {
  itemId: string;
  authorId: string;
  authorInfo: InlineCommentUserDisplayApiResponse | null;
  content: string;
  imageUrls: string[];
  mentionUserIds: string[];
  reactions: Record<string, InlineCommentReactionApiResponse[]>;
  reactionGroups: InlineCommentReactionGroupApiResponse[];
  createTime: number;
  updateTime: number;
}

export interface InlineCommentApiResponse {
  inlineCommentId: string;
  resourceId: string;
  applicableFromVersion: number | null;
  applicableToVersion: number | null;
  creatorId: string;
  creatorInfo: InlineCommentUserDisplayApiResponse | null;
  anchorRef: InlineCommentAnchorRefApiResponse;
  items: InlineCommentItemApiResponse[];
  resolved: boolean;
  resolvedBy: string | null;
  resolvedByInfo: InlineCommentUserDisplayApiResponse | null;
  resolvedAt: number | null;
  createTime: number;
  updateTime: number;
}

export interface ListInlineCommentsApiRequest {
  resourceId: string;
  contentVersion?: number;
  resolved?: boolean;
}

export type ListInlineCommentsApiResponse = InlineCommentApiResponse[];

export interface CreateInlineCommentApiRequest {
  resourceId: string;
  externalAnchorId: string;
  quoteText?: string;
  anchorPayload?: Record<string, unknown>;
  contentVersion?: number;
  applicableFromVersion?: number;
  applicableToVersion?: number;
  content: string;
  imageUrls?: string[];
  mentionUserIds?: string[];
}

export interface AddInlineCommentItemApiRequest {
  resourceId: string;
  inlineCommentId: string;
  contentVersion?: number;
  content: string;
  imageUrls?: string[];
  mentionUserIds?: string[];
}

export interface UpdateInlineCommentItemApiRequest extends AddInlineCommentItemApiRequest {
  itemId: string;
}

export interface SetInlineCommentItemReactionApiRequest {
  resourceId: string;
  inlineCommentId: string;
  itemId: string;
  contentVersion?: number;
  emojiId: string;
}

export interface DeleteInlineCommentItemReactionApiRequest {
  resourceId: string;
  inlineCommentId: string;
  itemId: string;
  contentVersion?: number;
  emojiId?: string;
}

export interface DeleteInlineCommentItemApiRequest {
  resourceId: string;
  inlineCommentId: string;
  itemId: string;
}

export interface ChangeInlineCommentResolveStatusApiRequest {
  resourceId: string;
  inlineCommentId: string;
  resolved: boolean;
  contentVersion?: number;
}
