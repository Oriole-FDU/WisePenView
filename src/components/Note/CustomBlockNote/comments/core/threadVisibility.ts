import type { ThreadData } from '@blocknote/core/comments';

import type { CollaboratorCommentVisibility } from './commentSettings';

export type ThreadVisibilityContext = {
  currentUserId: string;
  isOwner: boolean;
  collaboratorVisibility: CollaboratorCommentVisibility;
};

function getThreadComments(thread: ThreadData): ThreadData['comments'] {
  return Array.isArray(thread.comments) ? thread.comments : [];
}

/** 判断当前用户是否参与了该 thread（创建或回复） */
export function isUserParticipantInThread(thread: ThreadData, userId: string): boolean {
  if (!userId) {
    return false;
  }
  return getThreadComments(thread).some((comment) => comment.userId === userId);
}

/**
 * 侧栏 / 历史批注列表可见性：
 * - owner 始终可见全部
 * - collaboratorVisibility=all 时全员可见全部
 * - own_only 时非 owner 仅见自己参与的 thread
 */
export function isThreadVisibleToUser(
  thread: ThreadData,
  context: ThreadVisibilityContext
): boolean {
  if (thread.deletedAt) {
    return false;
  }
  if (context.isOwner || context.collaboratorVisibility === 'all') {
    return true;
  }
  return isUserParticipantInThread(thread, context.currentUserId);
}

export function filterThreadsByVisibility(
  threads: Iterable<ThreadData>,
  context: ThreadVisibilityContext
): ThreadData[] {
  return Array.from(threads).filter((thread) => isThreadVisibleToUser(thread, context));
}

export function getHiddenThreadIdsForUser(
  threads: Iterable<ThreadData>,
  context: ThreadVisibilityContext
): string[] {
  return Array.from(threads)
    .filter((thread) => !isThreadVisibleToUser(thread, context))
    .map((thread) => thread.id)
    .filter(Boolean);
}
