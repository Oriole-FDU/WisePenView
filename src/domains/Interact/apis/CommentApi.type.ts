import type { Nullable, PageApiRequest, PageR } from '@/apis/api.type';
import type { UserDisplayBaseApiResponse } from '@/domains/User/apis/UserApi.type';

export type CommentSortByApiValue = 'CREATE_TIME' | 'LIKE_COUNT';
export type CommentTypeApiValue = 'COMMENT' | 'REPLY_TO_COMMENT' | 'REPLY_TO_REPLY';

export type CommentAuthorApiResponse = UserDisplayBaseApiResponse;

export interface ResourceCommentItemApiResponse {
  resourceId: string;
  commentId: string;
  replyToUserId: Nullable<string>;
  authorId: string;
  authorInfo: Nullable<CommentAuthorApiResponse>;
  replyToUserInfo: Nullable<CommentAuthorApiResponse>;
  content: string;
  imageUrls: string[];
  likeCount: number;
  replyCount: number;
  commentType: CommentTypeApiValue;
  createTime: number;
  deleted: boolean;
}

export interface CreateCommentApiRequest {
  resourceId: string;
  content: string;
  imageUrls: string[];
}

export interface CreateReplyApiRequest extends CreateCommentApiRequest {
  replyTo: string;
}

export interface CommentItemActionApiRequest {
  resourceId: string;
  commentId: string;
}

export interface ListCommentsApiRequest extends PageApiRequest {
  resourceId: string;
  sortBy: CommentSortByApiValue;
}

export interface ListRepliesApiRequest extends PageApiRequest {
  rootCommentId: string;
}

export type CommentPageApiResponse = PageR<ResourceCommentItemApiResponse>;
