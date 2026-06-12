import type { ThreadData } from '@blocknote/core/comments';

import type { CustomBlockNoteEditor } from '../../blockNoteSchema';

export type ThreadPosition = { from: number; to: number };

type CommentThreadMetadata = { referenceText?: string };
type CommentTimeValue = Date | number | string | null | undefined;

export function getThreadComments(thread: ThreadData): ThreadData['comments'] {
  return Array.isArray(thread.comments) ? thread.comments : [];
}

export function getStoredThreadReferenceText(thread: ThreadData): string | undefined {
  const referenceText = (thread.metadata as CommentThreadMetadata | undefined)?.referenceText;
  return referenceText?.trim() || undefined;
}

export function getThreadReferenceText(
  editor: CustomBlockNoteEditor,
  thread: ThreadData,
  localReferenceText: string | undefined,
  threadPosition?: ThreadPosition
): string {
  const fallback = localReferenceText ?? getStoredThreadReferenceText(thread);

  if (!threadPosition) {
    return fallback ?? 'Original content deleted';
  }

  return editor.transact((tr) => {
    if (tr.doc.nodeSize < threadPosition.to) {
      return fallback ?? '';
    }

    const referenceText = tr.doc.textBetween(threadPosition.from, threadPosition.to);
    if (!referenceText) {
      return fallback ?? '';
    }
    if (referenceText.length > 15) {
      return `${referenceText.slice(0, 15)}…`;
    }
    return referenceText;
  });
}

export function sortCommentThreads(
  threads: ThreadData[],
  sort: 'position' | 'recent-activity' | 'oldest',
  threadPositions?: Map<string, ThreadPosition>
): ThreadData[] {
  if (sort === 'recent-activity') {
    return [...threads].sort((a, b) => getLastCommentTimeValue(b) - getLastCommentTimeValue(a));
  }

  if (sort === 'oldest') {
    return [...threads].sort(
      (a, b) => getCommentTimeValue(a.createdAt) - getCommentTimeValue(b.createdAt)
    );
  }

  return [...threads].sort((a, b) => {
    const threadA = threadPositions?.get(a.id)?.from ?? Number.MAX_VALUE;
    const threadB = threadPositions?.get(b.id)?.from ?? Number.MAX_VALUE;
    return threadA - threadB;
  });
}

function getLastCommentTimeValue(thread: ThreadData): number {
  const comments = getThreadComments(thread);
  return getCommentTimeValue(comments[comments.length - 1]?.createdAt);
}

function getCommentTimeValue(value: CommentTimeValue): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
  return 0;
}

export type ThreadResolvedFilter = 'open' | 'resolved' | 'all';

export function filterThreadsByResolvedState(
  threads: ThreadData[],
  filter: ThreadResolvedFilter
): ThreadData[] {
  return threads.filter((thread) => {
    if (!thread.resolved) {
      return filter === 'open' || filter === 'all';
    }
    return filter === 'resolved' || filter === 'all';
  });
}
