import type { ThreadData } from '@blocknote/core/comments';
import { CommentMark } from '@blocknote/core/comments';
import type { Node } from '@tiptap/pm/model';
import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
} from 'y-prosemirror';
import * as Y from 'yjs';

import type { CustomBlockNoteEditor } from '../blockNoteSchema';
import { WISEPEN_COMMENT_MARK_SYNC_META } from './commentMarkSync';
import { WISEPEN_FORMULA_YJS_ORIGIN } from './commentSyncGuard';
import { getBlockNoteThreadsYMap, type FormulaThreadAnchor } from './commentThreadConstants';
import { isThreadActive } from './formula/latexCommentSupport';

export const BLOCKNOTE_YJS_THREAD_DOCUMENT_SELECTIONS_MAP = 'thread-document-selections' as const;

export type EncodedThreadDocumentSelection = {
  anchor: Uint8Array;
  head: Uint8Array;
};

export function getBlockNoteThreadDocumentSelectionsYMap(doc: Y.Doc) {
  return doc.getMap<EncodedThreadDocumentSelection>(BLOCKNOTE_YJS_THREAD_DOCUMENT_SELECTIONS_MAP);
}

type ProsemirrorMapping = Map<Y.AbstractType<unknown>, Node | Node[]>;

type YjsBinding = {
  type: Y.XmlFragment;
  mapping: ProsemirrorMapping;
};

function getYjsBinding(editor: CustomBlockNoteEditor): YjsBinding | null {
  const syncState = ySyncPluginKey.getState(editor.prosemirrorView.state) as
    | { binding?: YjsBinding }
    | undefined;
  const binding = syncState?.binding;
  if (!binding?.type || !binding.mapping) {
    return null;
  }
  return binding;
}

export function persistThreadDocumentSelection(
  editor: CustomBlockNoteEditor,
  doc: Y.Doc,
  threadId: string,
  from: number,
  to: number
): void {
  const binding = getYjsBinding(editor);
  if (!binding || from >= to) {
    return;
  }

  const relAnchor = absolutePositionToRelativePosition(from, binding.type, binding.mapping);
  const relHead = absolutePositionToRelativePosition(to, binding.type, binding.mapping);
  const payload: EncodedThreadDocumentSelection = {
    anchor: Y.encodeRelativePosition(relAnchor),
    head: Y.encodeRelativePosition(relHead),
  };

  const selectionsYMap = getBlockNoteThreadDocumentSelectionsYMap(doc);
  const docRef = selectionsYMap.doc ?? doc;
  docRef.transact(() => {
    selectionsYMap.set(threadId, payload);
  }, WISEPEN_FORMULA_YJS_ORIGIN);
}

function resolveStoredThreadDocumentRange(
  editor: CustomBlockNoteEditor,
  doc: Y.Doc,
  stored: EncodedThreadDocumentSelection
): { from: number; to: number } | null {
  const binding = getYjsBinding(editor);
  if (!binding) {
    return null;
  }

  try {
    const anchorPos = relativePositionToAbsolutePosition(
      doc,
      binding.type,
      Y.decodeRelativePosition(stored.anchor),
      binding.mapping
    );
    const headPos = relativePositionToAbsolutePosition(
      doc,
      binding.type,
      Y.decodeRelativePosition(stored.head),
      binding.mapping
    );
    if (anchorPos == null || headPos == null) {
      return null;
    }
    const from = Math.max(0, Math.min(anchorPos, headPos));
    const to = Math.min(
      editor.prosemirrorView.state.doc.content.size,
      Math.max(anchorPos, headPos)
    );
    if (from >= to) {
      return null;
    }
    return { from, to };
  } catch {
    return null;
  }
}

function commentMarkCoversThread(
  editor: CustomBlockNoteEditor,
  threadId: string,
  from: number,
  to: number
): boolean {
  const markType = editor.prosemirrorView.state.schema.marks[CommentMark.name];
  if (!markType) {
    return false;
  }

  let found = false;
  editor.prosemirrorView.state.doc.nodesBetween(from, to, (node) => {
    if (found) {
      return;
    }
    if (
      node.marks.some(
        (mark) =>
          mark.type === markType && mark.attrs.threadId === threadId && mark.attrs.orphan !== true
      )
    ) {
      found = true;
    }
  });
  return found;
}

export function applyCommentMarkToRange(
  editor: CustomBlockNoteEditor,
  threadId: string,
  from: number,
  to: number
): boolean {
  const markType = editor.prosemirrorView.state.schema.marks[CommentMark.name];
  if (!markType || from >= to) {
    return false;
  }

  if (commentMarkCoversThread(editor, threadId, from, to)) {
    return true;
  }

  const rangeText = editor.prosemirrorView.state.doc.textBetween(from, to, '');
  if (!rangeText) {
    return false;
  }

  editor.transact((tr) => {
    tr.setMeta(WISEPEN_COMMENT_MARK_SYNC_META, true);
    const selectedNode = tr.doc.nodeAt(from);
    if (selectedNode?.type.name === 'math' && to <= from + selectedNode.nodeSize) {
      return;
    }
    tr.addMark(from, to, markType.create({ threadId, orphan: false }));
  });

  return commentMarkCoversThread(editor, threadId, from, to);
}

export function pruneThreadDocumentSelections(
  selectionsYMap: Y.Map<EncodedThreadDocumentSelection>,
  threadsYMap: Y.Map<unknown>
) {
  const staleIds: string[] = [];
  selectionsYMap.forEach((_value, threadId) => {
    const thread = threadsYMap.get(threadId) as ThreadData | undefined;
    if (!isThreadActive(thread)) {
      staleIds.push(String(threadId));
    }
  });
  if (staleIds.length === 0) {
    return;
  }
  const doc = selectionsYMap.doc;
  const remove = () => {
    staleIds.forEach((threadId) => {
      selectionsYMap.delete(threadId);
    });
  };
  if (doc) {
    doc.transact(remove, WISEPEN_FORMULA_YJS_ORIGIN);
  } else {
    remove();
  }
}

export function syncPlainTextCommentDocumentMarks(
  editor: CustomBlockNoteEditor,
  doc: Y.Doc,
  formulaAnchorsYMap: Y.Map<FormulaThreadAnchor>
): void {
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const selectionsYMap = getBlockNoteThreadDocumentSelectionsYMap(doc);

  pruneThreadDocumentSelections(selectionsYMap, threadsYMap);

  selectionsYMap.forEach((stored, threadId) => {
    const id = String(threadId);
    if (formulaAnchorsYMap.has(id)) {
      return;
    }
    const thread = threadsYMap.get(threadId) as ThreadData | undefined;
    if (!isThreadActive(thread)) {
      return;
    }

    const range = resolveStoredThreadDocumentRange(editor, doc, stored);
    if (!range) {
      return;
    }

    applyCommentMarkToRange(editor, id, range.from, range.to);
  });
}
