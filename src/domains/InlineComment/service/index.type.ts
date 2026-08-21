import type { InlineCommentThread } from '../entity/inlineComment';

export interface IInlineCommentService {
  listInlineComments(params: ListInlineCommentsRequest): Promise<InlineCommentThread[]>;
  createInlineComment(params: CreateInlineCommentRequest): Promise<string>;
  addInlineCommentItem(params: AddInlineCommentItemRequest): Promise<string>;
  updateInlineCommentItem(params: UpdateInlineCommentItemRequest): Promise<void>;
  setInlineCommentItemReaction(params: SetInlineCommentItemReactionRequest): Promise<void>;
  deleteInlineCommentItemReaction(params: DeleteInlineCommentItemReactionRequest): Promise<void>;
  deleteInlineCommentItem(params: DeleteInlineCommentItemRequest): Promise<void>;
  changeInlineCommentResolveStatus(params: ChangeInlineCommentResolveStatusRequest): Promise<void>;
}

export interface ListInlineCommentsRequest {
  resourceId: string;
  contentVersion?: number;
  resolved?: boolean;
}

export interface CreateInlineCommentRequest {
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

export interface AddInlineCommentItemRequest {
  resourceId: string;
  inlineCommentId: string;
  contentVersion?: number;
  content: string;
  imageUrls?: string[];
  mentionUserIds?: string[];
}

export interface UpdateInlineCommentItemRequest extends AddInlineCommentItemRequest {
  itemId: string;
}

export interface SetInlineCommentItemReactionRequest {
  resourceId: string;
  inlineCommentId: string;
  itemId: string;
  contentVersion?: number;
  emoji: string;
}

export interface DeleteInlineCommentItemReactionRequest {
  resourceId: string;
  inlineCommentId: string;
  itemId: string;
  contentVersion?: number;
  emoji?: string;
}

export interface DeleteInlineCommentItemRequest {
  resourceId: string;
  inlineCommentId: string;
  itemId: string;
}

export interface ChangeInlineCommentResolveStatusRequest {
  resourceId: string;
  inlineCommentId: string;
  resolved: boolean;
  contentVersion?: number;
}
