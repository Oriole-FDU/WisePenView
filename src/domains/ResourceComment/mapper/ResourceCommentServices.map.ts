import type {
  CommentPageApiResponse,
  ResourceCommentItemApiResponse,
} from '../apis/CommentApi.schema';
import type { CommentAuthor, CommentPage, ResourceComment } from '../entity/comment';

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
    content: data.content,
    imageUrls: data.imageUrls,
    likeCount: data.likeCount,
    replyCount: data.replyCount,
    createTime: data.createTime,
    deleted: data.deleted,
  };
}

const mapCommentPageFromApi = (data: CommentPageApiResponse): CommentPage => ({
  items: data.list.map(mapCommentFromApi),
  total: data.total,
  totalPage: data.totalPage,
});

export const ResourceCommentServicesMap = {
  mapCommentPageFromApi,
};
