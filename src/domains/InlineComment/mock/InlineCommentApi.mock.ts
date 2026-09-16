import { mockResponse } from '@/domains/_shared/mock/response';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import type { InlineCommentApi as InlineCommentApiContract } from '../apis/InlineCommentApi';
import type {
  InlineCommentApiResponse,
  InlineCommentItemApiResponse,
  InlineCommentReactionApiResponse,
} from '../apis/InlineCommentApi.type';

type MockItem = Omit<InlineCommentItemApiResponse, 'reactions'> & {
  itemId: string;
  reactions: Record<string, InlineCommentReactionApiResponse[]>;
};
type MockThread = Omit<InlineCommentApiResponse, 'items'> & {
  inlineCommentId: string;
  items: MockItem[];
  updateTime: number;
};
const threads = new Map<string, MockThread>();
const userId = '1';
const userInfo = { nickname: '示例用户' };
const thread = (resourceId: string, id: string) => {
  const value = threads.get(id);
  if (!value || value.resourceId !== resourceId)
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERACT_COMMENT_NOT_FOUND);
  return value;
};
const item = (resourceId: string, id: string, itemId: string) => {
  const value = thread(resourceId, id).items.find((i) => i.itemId === itemId);
  if (!value) throw createClientError(FRONTEND_CLIENT_ERROR.INTERACT_COMMENT_NOT_FOUND);
  return value;
};
const createItem = (
  content: string,
  imageUrls: string[] = [],
  mentionUserIds: string[] = []
): MockItem => ({
  itemId: `mock-item-${crypto.randomUUID()}`,
  authorId: userId,
  authorInfo: userInfo,
  content,
  imageUrls,
  mentionUserIds,
  reactions: {},
  reactionGroups: [],
  createTime: Date.now(),
  updateTime: Date.now(),
});
const setReactions = (target: MockItem, reactions: InlineCommentReactionApiResponse[]) => {
  target.reactions[userId] = reactions;
  target.reactionGroups = reactions.map((r) => ({
    emojiId: r.emojiId,
    count: 1,
    reactedByCurrentUser: true,
    users: [userInfo],
  }));
  target.updateTime = Date.now();
};

export const InlineCommentApi: typeof InlineCommentApiContract = {
  listInlineComments: ({ resourceId, resolved, contentVersion }) =>
    mockResponse(
      [...threads.values()]
        .filter(
          (t) =>
            t.resourceId === resourceId &&
            (resolved == null || t.resolved === resolved) &&
            (contentVersion == null ||
              ((t.applicableFromVersion == null || t.applicableFromVersion <= contentVersion) &&
                (t.applicableToVersion == null || t.applicableToVersion >= contentVersion)))
        )
        .sort((a, b) => b.updateTime - a.updateTime)
    ),
  createInlineComment: async (params) => {
    const id = `mock-inline-${crypto.randomUUID()}`;
    const now = Date.now();
    threads.set(id, {
      inlineCommentId: id,
      resourceId: params.resourceId,
      applicableFromVersion: params.applicableFromVersion,
      applicableToVersion: params.applicableToVersion,
      creatorId: userId,
      creatorInfo: userInfo,
      anchorRef: {
        externalAnchorId: params.externalAnchorId,
        quoteText: params.quoteText,
        anchorPayload: params.anchorPayload,
      },
      items: [createItem(params.content, params.imageUrls, params.mentionUserIds)],
      resolved: false,
      createTime: now,
      updateTime: now,
    });
    return id;
  },
  addInlineCommentItem: async (params) => {
    const target = thread(params.resourceId, params.inlineCommentId);
    const next = createItem(params.content, params.imageUrls, params.mentionUserIds);
    target.items.push(next);
    target.updateTime = Date.now();
    return next.itemId;
  },
  updateInlineCommentItem: async (params) => {
    const target = item(params.resourceId, params.inlineCommentId, params.itemId);
    Object.assign(target, {
      content: params.content,
      imageUrls: params.imageUrls,
      mentionUserIds: params.mentionUserIds,
      updateTime: Date.now(),
    });
    thread(params.resourceId, params.inlineCommentId).updateTime = Date.now();
  },
  setInlineCommentItemReaction: async (params) => {
    const target = item(params.resourceId, params.inlineCommentId, params.itemId);
    setReactions(target, [
      ...(target.reactions[userId] ?? []).filter((r) => r.emojiId !== params.emojiId),
      { emojiId: params.emojiId, createTime: Date.now() },
    ]);
  },
  deleteInlineCommentItemReaction: async (params) => {
    const target = item(params.resourceId, params.inlineCommentId, params.itemId);
    setReactions(
      target,
      params.emojiId
        ? (target.reactions[userId] ?? []).filter((r) => r.emojiId !== params.emojiId)
        : []
    );
  },
  deleteInlineCommentItem: async (params) => {
    const target = thread(params.resourceId, params.inlineCommentId);
    item(params.resourceId, params.inlineCommentId, params.itemId);
    target.items = target.items.filter((i) => i.itemId !== params.itemId);
    target.updateTime = Date.now();
    if (!target.items.length) threads.delete(params.inlineCommentId);
  },
  changeInlineCommentResolveStatus: async (params) => {
    const target = thread(params.resourceId, params.inlineCommentId);
    Object.assign(target, {
      resolved: params.resolved,
      resolvedBy: params.resolved ? userId : null,
      resolvedByInfo: params.resolved ? userInfo : null,
      resolvedAt: params.resolved ? Date.now() : null,
      updateTime: Date.now(),
    });
  },
};
