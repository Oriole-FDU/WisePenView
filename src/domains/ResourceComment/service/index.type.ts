import type { CommentPage, CommentSortBy } from '../entity/comment';

export interface IResourceCommentService {
  listComments(params: ListCommentsRequest): Promise<CommentPage>;
  listReplies(params: ListRepliesRequest): Promise<CommentPage>;
  createComment(params: CreateCommentRequest): Promise<string>;
  createReply(params: CreateReplyRequest): Promise<string>;
  deleteComment(params: CommentItemActionRequest): Promise<void>;
  toggleCommentLike(params: CommentItemActionRequest): Promise<boolean>;
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
