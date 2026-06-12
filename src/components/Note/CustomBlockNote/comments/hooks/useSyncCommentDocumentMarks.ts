import { useMount, useUpdateEffect } from 'ahooks';
import { useRef } from 'react';
import type { Doc } from 'yjs';

import type { WisepenProvider } from '@/domains/Note';
import type { CustomBlockNoteEditor } from '../../blockNoteSchema';
import {
  getBlockNoteThreadDocumentSelectionsYMap,
  syncPlainTextCommentDocumentMarks,
} from '../core/commentDocumentSelection';
import {
  getBlockNoteFormulaThreadAnchorsYMap,
  getBlockNoteThreadsYMap,
} from '../core/commentThreadConstants';

export type UseSyncCommentDocumentMarksOptions = {
  editor: CustomBlockNoteEditor;
  doc: Doc;
  provider: WisepenProvider;
  commentsEnabled: boolean;
  onAfterDocumentMarksSync?: () => void;
};

export function useSyncCommentDocumentMarks({
  editor,
  doc,
  provider,
  commentsEnabled,
  onAfterDocumentMarksSync,
}: UseSyncCommentDocumentMarksOptions) {
  const hasSyncedRef = useRef(false);
  const detachRef = useRef<(() => void) | null>(null);
  const firstSyncFrameRef = useRef<number | null>(null);
  const secondSyncFrameRef = useRef<number | null>(null);

  const runSync = () => {
    if (!commentsEnabled) {
      return;
    }
    const formulaAnchorsYMap = getBlockNoteFormulaThreadAnchorsYMap(doc);
    syncPlainTextCommentDocumentMarks(editor, doc, formulaAnchorsYMap);
    onAfterDocumentMarksSync?.();
  };

  const scheduleDocumentMarksSync = () => {
    if (firstSyncFrameRef.current !== null || secondSyncFrameRef.current !== null) {
      return;
    }

    // Yjs -> ProseMirror binding 可能比 provider sync 晚一帧，延后恢复批注 mark。
    firstSyncFrameRef.current = requestAnimationFrame(() => {
      firstSyncFrameRef.current = null;
      secondSyncFrameRef.current = requestAnimationFrame(() => {
        secondSyncFrameRef.current = null;
        runSync();
      });
    });
  };

  const cancelScheduledDocumentMarksSync = () => {
    if (firstSyncFrameRef.current !== null) {
      cancelAnimationFrame(firstSyncFrameRef.current);
      firstSyncFrameRef.current = null;
    }
    if (secondSyncFrameRef.current !== null) {
      cancelAnimationFrame(secondSyncFrameRef.current);
      secondSyncFrameRef.current = null;
    }
  };

  const detachDocumentMarksSync = () => {
    detachRef.current?.();
    detachRef.current = null;
    hasSyncedRef.current = false;
    cancelScheduledDocumentMarksSync();
  };

  const attachDocumentMarksSync = () => {
    detachDocumentMarksSync();

    if (!commentsEnabled) {
      return;
    }

    const threadsYMap = getBlockNoteThreadsYMap(doc);
    const selectionsYMap = getBlockNoteThreadDocumentSelectionsYMap(doc);
    const formulaAnchorsYMap = getBlockNoteFormulaThreadAnchorsYMap(doc);

    const handleSync = (isSynced: boolean) => {
      if (!isSynced) {
        return;
      }
      hasSyncedRef.current = true;
      scheduleDocumentMarksSync();
    };
    const handleCommentSidecarChange = () => {
      if (!hasSyncedRef.current) {
        return;
      }
      scheduleDocumentMarksSync();
    };

    provider.on('sync', handleSync);
    threadsYMap.observeDeep(handleCommentSidecarChange);
    selectionsYMap.observe(handleCommentSidecarChange);
    formulaAnchorsYMap.observe(handleCommentSidecarChange);

    if (provider.synced) {
      hasSyncedRef.current = true;
      scheduleDocumentMarksSync();
    }

    detachRef.current = () => {
      provider.off('sync', handleSync);
      threadsYMap.unobserveDeep(handleCommentSidecarChange);
      selectionsYMap.unobserve(handleCommentSidecarChange);
      formulaAnchorsYMap.unobserve(handleCommentSidecarChange);
    };
  };

  useMount(() => {
    attachDocumentMarksSync();
    return detachDocumentMarksSync;
  });

  useUpdateEffect(() => {
    attachDocumentMarksSync();
    return detachDocumentMarksSync;
  }, [commentsEnabled, doc, provider]);
}
