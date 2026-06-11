import { FloatingComposerController } from '@blocknote/react';
import { useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { useRef, type RefObject } from 'react';
import type * as Y from 'yjs';
import type { Doc } from 'yjs';

import CommentHistoryModal from '@/components/Note/CommentHistoryModal';
import type { CustomBlockNoteEditor } from '../blockNoteSchema';
import type { CommentUserDisplayRecord } from './comments.types';
import type { CollaboratorCommentVisibility } from './commentSettings';
import { CommentsSidebarPanel } from './CommentsSidebarPanel';
import commentStyles from './commentStyles.module.less';
import { isFormulaCommentSyncing, isWisePenFormulaYjsTransaction } from './commentSyncGuard';
import {
  getBlockNoteCommentUsersYMap,
  getBlockNoteFormulaThreadAnchorsYMap,
  getBlockNoteThreadReferencesYMap,
  getBlockNoteThreadsYMap,
} from './commentThreadConstants';
import { syncCommentUserProfileToYMap } from './commentUserProfile';
import type { PendingCommentReference } from './pendingCommentReference';
import { getThreadComments, type ThreadPosition } from './threadReferenceText';
import { CustomThreadsSidebar } from './threadsSidebar/CustomThreadsSidebar';
import type { ThreadVisibilityContext } from './threadVisibility';

export type NoteCommentsUiProps = {
  editor: CustomBlockNoteEditor;
  doc: Doc;
  commentsEnabled: boolean;
  commentsWritable: boolean;
  commentUserId: string;
  commentUsername: string;
  commentAvatarUrl: string;
  commentUsersById?: CommentUserDisplayRecord;
  isNoteOwner: boolean;
  collaboratorVisibility: CollaboratorCommentVisibility;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  onSidebarWidthChange: (width: number) => void;
  commentHistoryOpen: boolean;
  onCommentHistoryOpenChange: (open: boolean) => void;
  pendingCommentReferenceRef: RefObject<PendingCommentReference | null>;
  localThreadReferenceTexts: ReadonlyMap<string, string>;
  formulaThreadPositions: Map<string, ThreadPosition>;
  onBumpThreadsSidebar: () => void;
};

export function NoteCommentsUi({
  editor,
  doc,
  commentsEnabled,
  commentsWritable,
  commentUserId,
  commentUsername,
  commentAvatarUrl,
  isNoteOwner,
  collaboratorVisibility,
  sidebarCollapsed,
  sidebarWidth,
  onSidebarWidthChange,
  commentHistoryOpen,
  onCommentHistoryOpenChange,
  localThreadReferenceTexts,
  formulaThreadPositions,
  onBumpThreadsSidebar,
}: NoteCommentsUiProps) {
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const threadReferencesYMap = getBlockNoteThreadReferencesYMap(doc);
  const formulaAnchorsYMap = getBlockNoteFormulaThreadAnchorsYMap(doc);
  const commentUsersYMap = getBlockNoteCommentUsersYMap(doc);
  const detachListenersRef = useRef<(() => void) | null>(null);

  const visibilityContext: ThreadVisibilityContext = {
    currentUserId: commentUserId,
    isOwner: isNoteOwner,
    collaboratorVisibility,
  };
  const canReopenThread = (thread: Parameters<typeof getThreadComments>[0]) =>
    isNoteOwner || getThreadComments(thread)[0]?.userId === commentUserId;

  useMount(() => {
    if (!commentsEnabled) {
      return;
    }

    syncCommentUserProfileToYMap(commentUsersYMap, commentUserId, {
      username: commentUsername,
      avatarUrl: commentAvatarUrl,
    });

    const handleTransaction = (transaction: Y.Transaction) => {
      if (isWisePenFormulaYjsTransaction(transaction.origin)) {
        return;
      }
      const changed = transaction.changed as unknown as Map<unknown, unknown>;
      const threadsChanged = changed.has(threadsYMap);
      const anchorsChanged = changed.has(formulaAnchorsYMap);
      if (!threadsChanged && !anchorsChanged) {
        return;
      }
      if (isFormulaCommentSyncing) {
        return;
      }
      onBumpThreadsSidebar();
    };

    doc.on('afterTransaction', handleTransaction);
    detachListenersRef.current = () => {
      doc.off('afterTransaction', handleTransaction);
      detachListenersRef.current = null;
    };
  });

  useUpdateEffect(() => {
    if (!commentsEnabled) {
      return;
    }
    syncCommentUserProfileToYMap(commentUsersYMap, commentUserId, {
      username: commentUsername,
      avatarUrl: commentAvatarUrl,
    });
  }, [commentAvatarUrl, commentUserId, commentUsername, commentUsersYMap, commentsEnabled]);

  useUnmount(() => {
    detachListenersRef.current?.();
  });

  if (!commentsEnabled) {
    return null;
  }

  const historySidebar = (
    <CustomThreadsSidebar
      editor={editor}
      localThreadReferenceTexts={localThreadReferenceTexts}
      formulaThreadPositions={formulaThreadPositions}
      visibilityContext={visibilityContext}
      filter="resolved"
      sort="recent-activity"
      maxCommentsBeforeCollapse={5}
      actionMode="history"
      canReopenThread={canReopenThread}
    />
  );
  return (
    <>
      {commentsWritable ? (
        <FloatingComposerController
          floatingUIOptions={{
            elementProps: {
              className: commentStyles.floatingCommentComposer,
            },
          }}
        />
      ) : null}
      {!sidebarCollapsed ? (
        <CommentsSidebarPanel width={sidebarWidth} onWidthChange={onSidebarWidthChange}>
          <CustomThreadsSidebar
            editor={editor}
            localThreadReferenceTexts={localThreadReferenceTexts}
            formulaThreadPositions={formulaThreadPositions}
            visibilityContext={visibilityContext}
            filter="open"
            sort="position"
            maxCommentsBeforeCollapse={5}
          />
        </CommentsSidebarPanel>
      ) : null}
      <CommentHistoryModal isOpen={commentHistoryOpen} onOpenChange={onCommentHistoryOpenChange}>
        <div
          className={`bn-container bn-mantine ${commentStyles.threadsSidebarSurface} ${commentStyles.historyThreadsSurface}`}
          data-color-scheme="light"
        >
          {historySidebar}
        </div>
      </CommentHistoryModal>
    </>
  );
}
