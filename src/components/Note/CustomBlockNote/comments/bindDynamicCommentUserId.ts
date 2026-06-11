import type { YjsThreadStore } from '@blocknote/core/comments';

import type { WisePenThreadStoreAuth } from './wisePenThreadStoreAuth';

const THREAD_STORE_USER_ID_METHODS = [
  'createThread',
  'addComment',
  'updateComment',
  'deleteComment',
  'deleteThread',
  'resolveThread',
  'unresolveThread',
  'addReaction',
  'deleteReaction',
] as const;

type MutableUserIdTarget = {
  userId: string;
};

export function bindDynamicCommentUserId(
  threadStore: YjsThreadStore,
  threadStoreAuth: WisePenThreadStoreAuth,
  getActiveCommentUserId: () => string
): void {
  const mutableThreadStore = threadStore as unknown as MutableUserIdTarget &
    Record<string, unknown>;
  const mutableAuth = threadStoreAuth as unknown as MutableUserIdTarget;

  const syncUserId = () => {
    const userId = getActiveCommentUserId();
    mutableThreadStore.userId = userId;
    mutableAuth.userId = userId;
  };

  for (const method of THREAD_STORE_USER_ID_METHODS) {
    const original = (mutableThreadStore[method] as (...args: unknown[]) => unknown).bind(
      threadStore
    );
    mutableThreadStore[method] = (...args: unknown[]) => {
      syncUserId();
      return original(...args);
    };
  }
}
