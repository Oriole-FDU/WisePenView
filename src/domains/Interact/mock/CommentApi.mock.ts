import { mockResponse } from '@/domains/_shared/mock/response';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { createUuid } from '@/utils/random/createUuid';
import type { CommentApi as CommentApiContract } from '../apis/CommentApi';
import type {
  CommentItemActionApiRequest,
  CommentPageApiResponse,
  CreateCommentApiRequest,
  CreateReplyApiRequest,
  ListCommentsApiRequest,
  ListRepliesApiRequest,
  ResourceCommentItemApiResponse,
} from '../apis/CommentApi.type';

interface MockComment extends ResourceCommentItemApiResponse {
  likeCount: number;
  replyCount: number;
  rootCommentId?: string;
  commentType: 'COMMENT' | 'REPLY_TO_COMMENT' | 'REPLY_TO_REPLY';
}

const CURRENT_USER_ID = '1';
const commentsByResource = new Map<string, MockComment[]>();
const likedIdsByResource = new Map<string, Set<string>>();

const author = (name: string) => ({ nickname: name });
const buildMockId = (resourceId: string, suffix: string) => `mock-${resourceId}-${suffix}`;

function createInitialComments(resourceId: string): MockComment[] {
  const now = Date.now();
  const rootCommentId = buildMockId(resourceId, 'comment-1');
  const featured: MockComment[] = [
    {
      commentId: rootCommentId,
      authorId: '10086',
      authorInfo: author('王明'),
      content: '这份内容结构清晰，第二部分的示例很有帮助。',
      imageUrls: [],
      likeCount: 8,
      replyCount: 2,
      commentType: 'COMMENT',
      createTime: now - 36 * 60 * 1000,
      deleted: false,
    },
    {
      commentId: buildMockId(resourceId, 'reply-1'),
      rootCommentId,
      authorId: CURRENT_USER_ID,
      authorInfo: author('张三'),
      replyToUserId: '10086',
      replyToUserInfo: author('王明'),
      content: '我也觉得，图表把流程说明得很直观。',
      imageUrls: [],
      likeCount: 2,
      replyCount: 0,
      commentType: 'REPLY_TO_COMMENT',
      createTime: now - 25 * 60 * 1000,
      deleted: false,
    },
    {
      commentId: buildMockId(resourceId, 'reply-2'),
      rootCommentId,
      authorId: '10087',
      authorInfo: author('陈思齐'),
      replyToUserId: CURRENT_USER_ID,
      replyToUserInfo: author('张三'),
      content: '后面还有一个完整案例，可以接着看。',
      imageUrls: [],
      likeCount: 4,
      replyCount: 0,
      commentType: 'REPLY_TO_REPLY',
      createTime: now - 12 * 60 * 1000,
      deleted: false,
    },
  ];
  const remaining = Array.from({ length: 11 }, (_, index): MockComment => ({
    commentId: buildMockId(resourceId, `comment-${index + 2}`),
    authorId: index % 2 === 0 ? CURRENT_USER_ID : '10088',
    authorInfo: author(index % 2 === 0 ? '张三' : '陈思齐'),
    content: `这是第 ${index + 2} 条资源讨论。`,
    imageUrls: [],
    likeCount: Math.max(0, 5 - index),
    replyCount: 0,
    commentType: 'COMMENT',
    createTime: now - (index + 2) * 2 * 60 * 60 * 1000,
    deleted: false,
  }));
  return [...featured, ...remaining];
}

function getComments(resourceId: string): MockComment[] {
  const existing = commentsByResource.get(resourceId);
  if (existing) return existing;
  const comments = createInitialComments(resourceId);
  commentsByResource.set(resourceId, comments);
  likedIdsByResource.set(resourceId, new Set([buildMockId(resourceId, 'comment-1')]));
  return comments;
}

function toPage(
  items: ResourceCommentItemApiResponse[],
  page: number,
  size: number
): CommentPageApiResponse {
  return {
    list: items.slice((page - 1) * size, page * size),
    total: items.length,
    page,
    size,
    totalPage: Math.ceil(items.length / size),
  };
}

async function listMockComments(params: ListCommentsApiRequest): Promise<CommentPageApiResponse> {
  const comments = getComments(params.resourceId).filter((item) => item.commentType === 'COMMENT');
  comments.sort((a, b) =>
    params.sortBy === 'LIKE_COUNT' ? b.likeCount - a.likeCount : b.createTime - a.createTime
  );
  return mockResponse(toPage(comments, params.page, params.size));
}

async function listMockReplies(params: ListRepliesApiRequest): Promise<CommentPageApiResponse> {
  const replies = [...commentsByResource.values()]
    .flat()
    .filter((item) => item.rootCommentId === params.rootCommentId)
    .sort((a, b) => a.createTime - b.createTime);
  return mockResponse(toPage(replies, params.page, params.size));
}

async function createMockComment(params: CreateCommentApiRequest): Promise<string> {
  const commentId = `mock-comment-${createUuid()}`;
  getComments(params.resourceId).unshift({
    commentId,
    authorId: CURRENT_USER_ID,
    authorInfo: author('张三'),
    content: params.content,
    imageUrls: params.imageUrls ?? [],
    likeCount: 0,
    replyCount: 0,
    commentType: 'COMMENT',
    createTime: Date.now(),
    deleted: false,
  });
  return commentId;
}

async function createMockReply(params: CreateReplyApiRequest): Promise<string> {
  const comments = getComments(params.resourceId);
  const target = comments.find((item) => item.commentId === params.replyTo && !item.deleted);
  if (!target) throw createClientError(FRONTEND_CLIENT_ERROR.INTERACT_COMMENT_NOT_FOUND);
  const rootCommentId = target.commentType === 'COMMENT' ? target.commentId : target.rootCommentId;
  const root = comments.find((item) => item.commentId === rootCommentId);
  if (root) root.replyCount += 1;
  const commentId = `mock-reply-${createUuid()}`;
  comments.push({
    commentId,
    rootCommentId,
    authorId: CURRENT_USER_ID,
    authorInfo: author('张三'),
    replyToUserId: target.authorId,
    replyToUserInfo: target.authorInfo,
    content: params.content,
    imageUrls: params.imageUrls ?? [],
    likeCount: 0,
    replyCount: 0,
    commentType: target.commentType === 'COMMENT' ? 'REPLY_TO_COMMENT' : 'REPLY_TO_REPLY',
    createTime: Date.now(),
    deleted: false,
  });
  return commentId;
}

async function deleteMockComment(params: CommentItemActionApiRequest): Promise<void> {
  const comments = getComments(params.resourceId);
  const item = comments.find((comment) => comment.commentId === params.commentId);
  if (!item || item.deleted) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERACT_COMMENT_NOT_FOUND);
  }
  item.deleted = true;
  item.content = '';
  item.imageUrls = [];
  if (item.commentType !== 'COMMENT' && item.rootCommentId) {
    const root = comments.find((comment) => comment.commentId === item.rootCommentId);
    if (root) root.replyCount = Math.max(0, root.replyCount - 1);
  }
}

async function toggleMockCommentLike(params: CommentItemActionApiRequest): Promise<boolean> {
  const item = getComments(params.resourceId).find(
    (comment) => comment.commentId === params.commentId
  );
  if (!item || item.deleted) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERACT_COMMENT_NOT_FOUND);
  }
  const likedIds = likedIdsByResource.get(params.resourceId) ?? new Set<string>();
  likedIdsByResource.set(params.resourceId, likedIds);
  const liked = !likedIds.has(params.commentId);
  if (liked) likedIds.add(params.commentId);
  else likedIds.delete(params.commentId);
  item.likeCount = Math.max(0, item.likeCount + (liked ? 1 : -1));
  return liked;
}

export function getMockCommentLikeIds(resourceId: string): ReadonlySet<string> {
  getComments(resourceId);
  return new Set(likedIdsByResource.get(resourceId));
}

export const CommentApi: typeof CommentApiContract = {
  listComments: listMockComments,
  listReplies: listMockReplies,
  createComment: createMockComment,
  createReply: createMockReply,
  deleteCommentItem: deleteMockComment,
  toggleLike: toggleMockCommentLike,
};
