import { useMemoizedFn, useUnmount } from 'ahooks';
import { useState, useSyncExternalStore } from 'react';

import type { InlineCommentProps } from '@/components/business/InlineComment/index.type';
import { useInlineCommentService } from '@/domains';
import { type NoteInlineCommentDraft, NoteInlineCommentSession } from '@/domains/Note';
import { useApi } from '@/hooks/useApi';
import { useResourceSidePanelStore } from '@/views/resource/_store/useResourceSidePanelStore';

const INLINE_COMMENT_POLLING_INTERVAL = 8_000;

export function useNoteCommentsController(resourceId: string) {
  const inlineCommentService = useInlineCommentService();
  const setResourceSidePanelMode = useResourceSidePanelStore((state) => state.setMode);
  const [inlineCommentSession] = useState(
    () => new NoteInlineCommentSession({ resourceId, inlineCommentService })
  );
  const inlineCommentSnapshot = useSyncExternalStore(
    inlineCommentSession.subscribe,
    inlineCommentSession.getSnapshot
  );
  const [inlineCommentDraft, setInlineCommentDraft] = useState<NoteInlineCommentDraft>();
  const [activeInlineCommentThreadId, setActiveInlineCommentThreadId] = useState<string>();
  const [inlineCommentScrollTarget, setInlineCommentScrollTarget] = useState<{
    threadId: string;
  }>();
  const [isInlineCommentHistoryOpen, setIsInlineCommentHistoryOpen] = useState(false);

  useApi(() => inlineCommentSession.refresh(), {
    pollingInterval: INLINE_COMMENT_POLLING_INTERVAL,
    refreshDeps: [inlineCommentSession],
  });

  useUnmount(() => inlineCommentSession.destroy());

  const handleInlineCommentCreateRequest = useMemoizedFn((draft: NoteInlineCommentDraft) => {
    setInlineCommentDraft(draft);
    setResourceSidePanelMode(resourceId, 'inlineComment');
  });

  const handleInlineCommentThreadSelect = useMemoizedFn((threadId: string) => {
    setActiveInlineCommentThreadId(threadId);
    setInlineCommentScrollTarget({ threadId });
    setResourceSidePanelMode(resourceId, 'inlineComment');
  });

  const inlineCommentsBinding = {
    session: inlineCommentSession,
    onCreateRequest: handleInlineCommentCreateRequest,
    onThreadSelect: handleInlineCommentThreadSelect,
  };

  const panel: Omit<InlineCommentProps, 'currentUserId' | 'resourceOwnerId' | 'imageUpload'> = {
    threads: inlineCommentSnapshot.threads,
    resolvedThreads: inlineCommentSnapshot.resolvedThreads,
    loading: inlineCommentSnapshot.loading,
    error: inlineCommentSnapshot.error,
    draft: inlineCommentDraft
      ? {
          key: `${inlineCommentDraft.anchor.start}:${inlineCommentDraft.anchor.end}`,
          quoteText: inlineCommentDraft.quoteText,
        }
      : undefined,
    activeThreadId: activeInlineCommentThreadId,
    isHistoryOpen: isInlineCommentHistoryOpen,
    onHistoryOpenChange: setIsInlineCommentHistoryOpen,
    onDraftClose: () => setInlineCommentDraft(undefined),
    onThreadSelect: handleInlineCommentThreadSelect,
    onCreate: async (payload) => {
      if (!inlineCommentDraft) return;
      const thread = await inlineCommentSession.createThread({ ...inlineCommentDraft, ...payload });
      handleInlineCommentThreadSelect(thread.threadId);
      setInlineCommentDraft(undefined);
    },
    onReply: async (threadId, { content, imageUrls, idempotencyKey }) => {
      await inlineCommentSession.addComment(threadId, content, imageUrls, idempotencyKey);
    },
    onReactionChange: ({ threadId, itemId, emojiId, selected }) =>
      inlineCommentSession.changeReaction(threadId, itemId, emojiId, selected),
    onResolve: async (threadId) => {
      await inlineCommentSession.resolveThread(threadId);
      setActiveInlineCommentThreadId((current) => (current === threadId ? undefined : current));
    },
    onReopen: (threadId) => inlineCommentSession.reopenThread(threadId),
    onDelete: ({ threadId, itemId }) => inlineCommentSession.deleteComment(threadId, itemId),
  };
  return {
    panel,
    scrollTarget: inlineCommentScrollTarget,
    openHistory: () => setIsInlineCommentHistoryOpen(true),
    binding: inlineCommentsBinding,
  };
}
