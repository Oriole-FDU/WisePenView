import { CommentsExtension, type ThreadData } from '@blocknote/core/comments';
import { useExtensionState } from '@blocknote/react';
import { useCallback, useRef, useState, type RefObject } from 'react';
import type { Doc } from 'yjs';

import { useNoteCommentsSidebarStore } from '@/store/useNoteCommentsSidebarStore';
import type { CustomBlockNoteEditor } from '../../../blockNoteSchema';
import { runWithFormulaCommentSync } from '../../../comments/core/commentSyncGuard';
import {
  getBlockNoteFormulaThreadAnchorsYMap,
  getBlockNoteThreadReferencesYMap,
  getBlockNoteThreadsYMap,
  type FormulaThreadAnchor,
} from '../../../comments/core/commentThreadConstants';
import {
  applyPendingCommentReference,
  capturePendingCommentSelection,
  type PendingCommentReference,
  type PendingCommentSelection,
} from '../../../comments/core/pendingCommentReference';
import type { ThreadPosition } from '../../../comments/core/threadReferenceText';
import {
  getFormulaCommentReferenceText,
  isSameFormulaThreadAnchor,
} from './formulaCommentReference';
import type {
  StartFormulaCommentOptions,
  UpdateFormulaCommentReferenceOptions,
} from './latexCommentContext.types';
import {
  captureInlineMathAnchor,
  formatFormulaReferenceText,
  getCommentsExtension,
  isThreadActive,
  resolveAllFormulaThreadPositions,
  selectInlineMathNode,
  selectMathBlock,
  syncFormulaThreadMarks,
  updateFormulaThreadReferences,
} from './latexCommentSupport';
import { applyPendingFormulaAnchor, type PendingFormulaAnchor } from './pendingFormulaAnchor';

export type UseFormulaCommentsOptions = {
  editor: CustomBlockNoteEditor;
  doc: Doc;
  resourceId: string;
  commentsEnabled: boolean;
  commentsWritable: boolean;
  readOnly: boolean;
  pendingCommentReferenceRef: RefObject<PendingCommentReference | null>;
  pendingCommentSelectionRef: RefObject<PendingCommentSelection | null>;
};

export function useFormulaComments({
  editor,
  doc,
  resourceId,
  commentsEnabled,
  commentsWritable,
  readOnly,
  pendingCommentReferenceRef,
  pendingCommentSelectionRef,
}: UseFormulaCommentsOptions) {
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const threadReferencesYMap = getBlockNoteThreadReferencesYMap(doc);
  const formulaAnchorsYMap = getBlockNoteFormulaThreadAnchorsYMap(doc);
  const setNoteCommentsSidebarCollapsed = useNoteCommentsSidebarStore(
    (state) => state.setNoteCommentsSidebarCollapsed
  );

  const pendingFormulaAnchorRef = useRef<PendingFormulaAnchor | null>(null);
  const unmarkableFormulaThreadsRef = useRef(new Set<string>());
  const syncingFormulaStateRef = useRef(false);
  const bumpScheduledRef = useRef(false);
  const [liveFormulaReferenceTexts, setLiveFormulaReferenceTexts] = useState(
    () => new Map<string, string>()
  );
  const [threadReferenceTextsRevision, setThreadReferenceTextsRevision] = useState(0);

  const commitPendingReferenceForThread = useCallback(
    (threadId: string) => {
      const pending = pendingCommentReferenceRef.current;
      if (!pending || pending.existingThreadIds.has(threadId)) {
        return;
      }
      threadReferencesYMap.set(threadId, pending.referenceText);
      pendingCommentReferenceRef.current = null;
      setThreadReferenceTextsRevision((revision) => revision + 1);
    },
    [pendingCommentReferenceRef, threadReferencesYMap]
  );

  const runBumpFormulaState = () => {
    if (syncingFormulaStateRef.current) {
      return;
    }

    if (pendingCommentReferenceRef.current) {
      pendingCommentReferenceRef.current = applyPendingCommentReference(
        pendingCommentReferenceRef.current,
        threadsYMap,
        threadReferencesYMap
      );
    }
    pendingFormulaAnchorRef.current = applyPendingFormulaAnchor(
      pendingFormulaAnchorRef.current,
      threadsYMap,
      formulaAnchorsYMap
    );

    if (!readOnly && formulaAnchorsYMap.size > 0) {
      syncingFormulaStateRef.current = true;
      try {
        runWithFormulaCommentSync(() => {
          syncFormulaThreadMarks(
            editor,
            formulaAnchorsYMap,
            threadsYMap,
            unmarkableFormulaThreadsRef.current
          );
          updateFormulaThreadReferences(editor, formulaAnchorsYMap, threadReferencesYMap);
        });
      } finally {
        syncingFormulaStateRef.current = false;
      }
    }
  };

  const bumpFormulaState = () => {
    if (bumpScheduledRef.current) {
      return;
    }
    bumpScheduledRef.current = true;
    queueMicrotask(() => {
      bumpScheduledRef.current = false;
      runBumpFormulaState();
    });
  };

  const rememberPendingCommentReference = () => {
    if (!commentsWritable || !commentsEnabled) {
      return;
    }

    const referenceText =
      editor.getSelectedText().trim() || getFormulaCommentReferenceText(editor) || undefined;
    const selection = capturePendingCommentSelection(editor);
    if (selection) {
      pendingCommentSelectionRef.current = selection;
    }
    pendingCommentReferenceRef.current = referenceText
      ? {
          referenceText,
          existingThreadIds: new Set(Array.from(threadsYMap.keys())),
        }
      : null;
  };

  const startFormulaComment = (options: StartFormulaCommentOptions) => {
    if (!commentsEnabled || !commentsWritable) {
      return;
    }

    const referenceText = formatFormulaReferenceText(options.expression, options.kind);
    if (!referenceText) {
      return;
    }

    const commentsExtension = getCommentsExtension(editor);
    if (!commentsExtension) {
      return;
    }

    const formulaSelection = capturePendingCommentSelection(editor);
    if (formulaSelection) {
      pendingCommentSelectionRef.current = formulaSelection;
    }
    pendingCommentReferenceRef.current = {
      referenceText,
      existingThreadIds: new Set(Array.from(threadsYMap.keys())),
    };

    const anchor: FormulaThreadAnchor | null =
      options.kind === 'block' && options.blockId
        ? { kind: 'block', blockId: options.blockId }
        : captureInlineMathAnchor(editor, options.shellElement);

    if (!anchor) {
      pendingCommentReferenceRef.current = null;
      return;
    }

    pendingFormulaAnchorRef.current = {
      anchor,
      existingThreadIds: new Set(Array.from(threadsYMap.keys())),
    };

    const selected =
      options.kind === 'block' && options.blockId
        ? selectMathBlock(editor, options.blockId)
        : selectInlineMathNode(editor, options.shellElement);

    if (!selected) {
      pendingCommentReferenceRef.current = null;
      pendingFormulaAnchorRef.current = null;
      return;
    }

    editor.focus();
    setNoteCommentsSidebarCollapsed(resourceId, false);
    commentsExtension.startPendingComment();
  };

  const updateFormulaCommentReference = (options: UpdateFormulaCommentReferenceOptions) => {
    if (!commentsEnabled) {
      return;
    }

    const referenceText = formatFormulaReferenceText(options.expression, options.kind);
    if (!referenceText) {
      return;
    }

    const matchingThreadIds: string[] = [];
    formulaAnchorsYMap.forEach((anchor, threadId) => {
      if (isSameFormulaThreadAnchor(anchor, options.anchor)) {
        matchingThreadIds.push(String(threadId));
      }
    });

    if (options.persist) {
      matchingThreadIds.forEach((threadId) => {
        if (threadReferencesYMap.get(threadId) !== referenceText) {
          threadReferencesYMap.set(threadId, referenceText);
        }
      });
    }

    setLiveFormulaReferenceTexts((prev) => {
      let next: Map<string, string> | null = null;

      matchingThreadIds.forEach((id) => {
        if (prev.get(id) !== referenceText) {
          next ??= new Map(prev);
          next.set(id, referenceText);
        }
      });

      return next ?? prev;
    });
  };

  const clearFormulaCommentReferenceOverride = (anchorToClear: FormulaThreadAnchor) => {
    setLiveFormulaReferenceTexts((prev) => {
      let next: Map<string, string> | null = null;

      formulaAnchorsYMap.forEach((anchor, threadId) => {
        if (!isSameFormulaThreadAnchor(anchor, anchorToClear)) {
          return;
        }

        const id = String(threadId);
        if (prev.has(id)) {
          next ??= new Map(prev);
          next.delete(id);
        }
      });

      return next ?? prev;
    });
  };

  const getThreadAnchor = (threadId: string) =>
    formulaAnchorsYMap.get(threadId) as FormulaThreadAnchor | undefined;

  const visibleThreadReferenceTexts = (() => {
    void threadReferenceTextsRevision;
    const references = new Map<string, string>();

    threadReferencesYMap.forEach((referenceText, threadId) => {
      references.set(String(threadId), referenceText);
    });

    liveFormulaReferenceTexts.forEach((referenceText, threadId) => {
      references.set(threadId, referenceText);
    });

    return references;
  })();

  const formulaThreadPositions = resolveAllFormulaThreadPositions(editor, formulaAnchorsYMap);
  const { selectedThreadId } = useExtensionState(CommentsExtension, { editor });

  const hasActiveFormulaComment = useCallback(
    (anchor: FormulaThreadAnchor) => {
      let found = false;
      formulaAnchorsYMap.forEach((stored, threadId) => {
        if (found) {
          return;
        }
        if (!isSameFormulaThreadAnchor(stored, anchor)) {
          return;
        }
        const thread = threadsYMap.get(threadId) as ThreadData | undefined;
        if (isThreadActive(thread)) {
          found = true;
        }
      });
      return found;
    },
    [formulaAnchorsYMap, threadsYMap]
  );

  const isFormulaThreadSelected = useCallback(
    (anchor: FormulaThreadAnchor) => {
      if (!selectedThreadId) {
        return false;
      }
      const selected = formulaAnchorsYMap.get(selectedThreadId) as FormulaThreadAnchor | undefined;
      return Boolean(selected && isSameFormulaThreadAnchor(selected, anchor));
    },
    [formulaAnchorsYMap, selectedThreadId]
  );

  const latexCommentProviderProps = {
    canComment: commentsEnabled && commentsWritable,
    startFormulaComment,
    updateFormulaCommentReference,
    clearFormulaCommentReferenceOverride,
    selectedThreadId,
    commentEditor: editor,
    hasActiveFormulaComment,
    isFormulaThreadSelected,
    getThreadAnchor,
  };

  return {
    latexCommentProviderProps,
    rememberPendingCommentReference,
    commitPendingReferenceForThread,
    bumpFormulaState,
    visibleThreadReferenceTexts,
    formulaThreadPositions,
    formulaAnchorsYMap,
    threadsYMap,
    threadReferencesYMap,
  };
}

export type { ThreadPosition };
