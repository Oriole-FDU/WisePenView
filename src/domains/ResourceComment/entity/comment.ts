export type CommentSortBy = 'CREATE_TIME' | 'LIKE_COUNT';

export interface CommentAuthor {
  name: string;
  avatar?: string;
}

export interface ResourceComment {
  commentId: string;
  authorId: string;
  author: CommentAuthor;
  replyToUser?: CommentAuthor;
  content: string;
  imageUrls: string[];
  likeCount: number;
  replyCount: number;
  createTime: number;
  deleted: boolean;
}

export interface CommentPage {
  items: ResourceComment[];
  total: number;
  totalPage: number;
}
