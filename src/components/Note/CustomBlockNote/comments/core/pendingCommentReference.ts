import type * as Y from 'yjs';

import type { CustomBlockNoteEditor } from '../../blockNoteSchema';

export type PendingCommentSelection = {
  anchor: number;
  head: number;
};

export type PendingCommentReference = {
  referenceText: string;
  existingThreadIds: Set<string>;
};

export function capturePendingCommentSelection(
  editor: CustomBlockNoteEditor
): PendingCommentSelection | undefined {
  const { anchor, head } = editor.prosemirrorView.state.selection;
  if (anchor === head) {
    return undefined;
  }
  return { anchor, head };
}

export function applyPendingCommentReference(
  pendingReference: PendingCommentReference | null,
  threadsYMap: Y.Map<unknown>,
  threadReferencesYMap: Y.Map<string>
): PendingCommentReference | null {
  if (!pendingReference) {
    return null;
  }

  let remaining: PendingCommentReference | null = pendingReference;

  threadsYMap.forEach((_rawThread, threadId) => {
    if (!remaining) {
      return;
    }
    const id = String(threadId);
    if (remaining.existingThreadIds.has(id)) {
      return;
    }
    threadReferencesYMap.set(id, remaining.referenceText);
    remaining = null;
  });

  return remaining;
}
