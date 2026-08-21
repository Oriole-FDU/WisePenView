import type {
  AddInlineCommentItemRequest,
  ChangeInlineCommentResolveStatusRequest,
  CreateInlineCommentRequest,
  DeleteInlineCommentItemReactionRequest,
  DeleteInlineCommentItemRequest,
  IInlineCommentService,
  InlineCommentItem,
  InlineCommentThread,
  ListInlineCommentsRequest,
  SetInlineCommentItemReactionRequest,
  UpdateInlineCommentItemRequest,
} from '@/domains/InlineComment';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { createUuid } from '@/utils/random/createUuid';

const threadsById = new Map<string, InlineCommentThread>();
const currentUser = { id: 'mock-current-user', name: '当前用户' };

function createId(prefix: string): string {
  return `${prefix}-${createUuid()}`;
}

function getThread(inlineCommentId: string): InlineCommentThread {
  const thread = threadsById.get(inlineCommentId);
  if (!thread) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERACT_COMMENT_NOT_FOUND);
  }
  return thread;
}

function createItem(
  content: string,
  imageUrls: string[],
  mentionUserIds: string[]
): InlineCommentItem {
  const now = Date.now();
  return {
    itemId: createId('mock-inline-comment-item'),
    authorId: currentUser.id,
    author: currentUser,
    content,
    imageUrls,
    mentionUserIds,
    reactions: [],
    reactionGroups: [],
    createdAt: now,
    updatedAt: now,
  };
}

function updateItemReactions(
  item: InlineCommentItem,
  reactions: InlineCommentItem['reactions']
): InlineCommentItem {
  const groupsByEmoji = new Map<string, InlineCommentItem['reactionGroups'][number]>();
  reactions.forEach((reaction) => {
    const group = groupsByEmoji.get(reaction.emoji);
    groupsByEmoji.set(reaction.emoji, {
      emoji: reaction.emoji,
      count: (group?.count ?? 0) + 1,
      reactedByCurrentUser: group?.reactedByCurrentUser || reaction.userId === currentUser.id,
      users: reaction.userId === currentUser.id ? [currentUser] : (group?.users ?? []),
    });
  });
  return {
    ...item,
    reactions,
    reactionGroups: [...groupsByEmoji.values()],
    updatedAt: Date.now(),
  };
}

const listInlineComments = async (
  params: ListInlineCommentsRequest
): Promise<InlineCommentThread[]> =>
  [...threadsById.values()]
    .filter((thread) => thread.resourceId === params.resourceId)
    .filter((thread) => params.resolved == null || thread.resolved === params.resolved)
    .filter((thread) => {
      if (params.contentVersion == null) return true;
      return (
        (thread.applicableFromVersion == null ||
          thread.applicableFromVersion <= params.contentVersion) &&
        (thread.applicableToVersion == null || thread.applicableToVersion >= params.contentVersion)
      );
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);

const createInlineComment = async (params: CreateInlineCommentRequest): Promise<string> => {
  const now = Date.now();
  const inlineCommentId = createId('mock-inline-comment');
  threadsById.set(inlineCommentId, {
    inlineCommentId,
    resourceId: params.resourceId,
    applicableFromVersion: params.applicableFromVersion,
    applicableToVersion: params.applicableToVersion,
    creatorId: currentUser.id,
    creator: currentUser,
    anchor: {
      externalAnchorId: params.externalAnchorId,
      quoteText: params.quoteText ?? '',
      anchorPayload: params.anchorPayload ?? {},
    },
    items: [createItem(params.content, params.imageUrls ?? [], params.mentionUserIds ?? [])],
    resolved: false,
    createdAt: now,
    updatedAt: now,
  });
  return inlineCommentId;
};

const addInlineCommentItem = async (params: AddInlineCommentItemRequest): Promise<string> => {
  const thread = getThread(params.inlineCommentId);
  const item = createItem(params.content, params.imageUrls ?? [], params.mentionUserIds ?? []);
  threadsById.set(params.inlineCommentId, {
    ...thread,
    items: [...thread.items, item],
    updatedAt: item.updatedAt,
  });
  return item.itemId;
};

const updateInlineCommentItem = async (params: UpdateInlineCommentItemRequest): Promise<void> => {
  const thread = getThread(params.inlineCommentId);
  const now = Date.now();
  threadsById.set(params.inlineCommentId, {
    ...thread,
    items: thread.items.map((item) =>
      item.itemId === params.itemId
        ? {
            ...item,
            content: params.content,
            imageUrls: params.imageUrls ?? [],
            mentionUserIds: params.mentionUserIds ?? [],
            updatedAt: now,
          }
        : item
    ),
    updatedAt: now,
  });
};

const setInlineCommentItemReaction = async (
  params: SetInlineCommentItemReactionRequest
): Promise<void> => {
  const thread = getThread(params.inlineCommentId);
  const now = Date.now();
  threadsById.set(params.inlineCommentId, {
    ...thread,
    items: thread.items.map((item) =>
      item.itemId === params.itemId
        ? updateItemReactions(item, [
            ...item.reactions.filter(
              (reaction) => reaction.userId !== currentUser.id || reaction.emoji !== params.emoji
            ),
            { userId: currentUser.id, emoji: params.emoji, createdAt: now },
          ])
        : item
    ),
  });
};

const deleteInlineCommentItemReaction = async (
  params: DeleteInlineCommentItemReactionRequest
): Promise<void> => {
  const thread = getThread(params.inlineCommentId);
  threadsById.set(params.inlineCommentId, {
    ...thread,
    items: thread.items.map((item) =>
      item.itemId === params.itemId
        ? updateItemReactions(
            item,
            item.reactions.filter(
              (reaction) => reaction.userId !== currentUser.id || reaction.emoji !== params.emoji
            )
          )
        : item
    ),
  });
};

const deleteInlineCommentItem = async (params: DeleteInlineCommentItemRequest): Promise<void> => {
  const thread = getThread(params.inlineCommentId);
  if (thread.items.length <= 1) {
    threadsById.delete(params.inlineCommentId);
    return;
  }
  threadsById.set(params.inlineCommentId, {
    ...thread,
    items: thread.items.filter((item) => item.itemId !== params.itemId),
    updatedAt: Date.now(),
  });
};

const changeInlineCommentResolveStatus = async (
  params: ChangeInlineCommentResolveStatusRequest
): Promise<void> => {
  const thread = getThread(params.inlineCommentId);
  const now = Date.now();
  threadsById.set(params.inlineCommentId, {
    ...thread,
    resolved: params.resolved,
    resolvedBy: params.resolved ? currentUser.id : undefined,
    resolvedByUser: params.resolved ? currentUser : undefined,
    resolvedAt: params.resolved ? now : undefined,
    updatedAt: now,
  });
};

export const InlineCommentServicesMock: IInlineCommentService = {
  listInlineComments,
  createInlineComment,
  addInlineCommentItem,
  updateInlineCommentItem,
  setInlineCommentItemReaction,
  deleteInlineCommentItemReaction,
  deleteInlineCommentItem,
  changeInlineCommentResolveStatus,
};
