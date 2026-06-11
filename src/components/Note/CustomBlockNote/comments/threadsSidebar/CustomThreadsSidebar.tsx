import type { ThreadData } from '@blocknote/core/comments';
import { CommentsExtension } from '@blocknote/core/comments';
import { useExtensionState, useThreads } from '@blocknote/react';

import type { CustomBlockNoteEditor } from '../../blockNoteSchema';
import {
  filterThreadsByResolvedState,
  getThreadReferenceText,
  sortCommentThreads,
  type ThreadPosition,
  type ThreadResolvedFilter,
} from '../threadReferenceText';
import { filterThreadsByVisibility, type ThreadVisibilityContext } from '../threadVisibility';
import { CustomThreadItem } from './CustomThreadItem';

export type CustomThreadsSidebarProps = {
  editor: CustomBlockNoteEditor;
  localThreadReferenceTexts: ReadonlyMap<string, string>;
  formulaThreadPositions?: Map<string, ThreadPosition>;
  visibilityContext: ThreadVisibilityContext;
  filter?: ThreadResolvedFilter;
  sort?: 'position' | 'recent-activity' | 'oldest';
  maxCommentsBeforeCollapse?: number;
  actionMode?: 'default' | 'history';
  canReopenThread?: (thread: ThreadData) => boolean;
};

export function CustomThreadsSidebar({
  editor,
  localThreadReferenceTexts,
  formulaThreadPositions = new Map(),
  visibilityContext,
  filter = 'open',
  sort = 'position',
  maxCommentsBeforeCollapse,
  actionMode = 'default',
  canReopenThread,
}: CustomThreadsSidebarProps) {
  const { selectedThreadId, threadPositions } = useExtensionState(CommentsExtension, { editor });
  const threads = useThreads();

  const mergedThreadPositions = new Map(threadPositions);
  formulaThreadPositions.forEach((position, threadId) => {
    if (!mergedThreadPositions.has(threadId)) {
      mergedThreadPositions.set(threadId, position);
    }
  });

  const visibleThreads = filterThreadsByVisibility(threads.values(), visibilityContext);
  const resolvedFiltered = filterThreadsByResolvedState(visibleThreads, filter);
  const sortedThreads = sortCommentThreads(resolvedFiltered, sort, mergedThreadPositions);
  const filteredAndSortedThreads = sortedThreads.map((thread) => ({
    thread,
    referenceText: getThreadReferenceText(
      editor,
      thread,
      localThreadReferenceTexts.get(thread.id),
      mergedThreadPositions.get(thread.id)
    ),
  }));

  return (
    <div className="bn-threads-sidebar">
      {filteredAndSortedThreads.map(({ thread, referenceText }) => (
        <CustomThreadItem
          key={thread.id}
          thread={thread}
          selectedThreadId={selectedThreadId}
          referenceText={referenceText}
          maxCommentsBeforeCollapse={maxCommentsBeforeCollapse}
          actionMode={actionMode}
          canReopen={canReopenThread?.(thread) ?? false}
        />
      ))}
    </div>
  );
}

export type { ThreadData, ThreadPosition, ThreadResolvedFilter, ThreadVisibilityContext };
