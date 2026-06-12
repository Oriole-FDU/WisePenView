import { CommentsExtension } from '@blocknote/core/comments';
import { useExtensionState } from '@blocknote/react';
import { useMount, useUpdateEffect } from 'ahooks';
import { useState } from 'react';

import type { CustomBlockNoteEditor } from '../../../blockNoteSchema';
import type { FormulaThreadAnchor } from '../../../comments/core/commentThreadConstants';

type UseMathBlockCommentHighlightOptions = {
  commentEditor: CustomBlockNoteEditor;
  anchor: FormulaThreadAnchor;
  revisionKey: string;
  hasActiveFormulaComment: (anchor: FormulaThreadAnchor) => boolean;
  getThreadAnchor: (threadId: string) => FormulaThreadAnchor | undefined;
};

function isBlockFormulaThreadSelected(
  selectedThreadId: string | undefined,
  getThreadAnchor: (threadId: string) => FormulaThreadAnchor | undefined,
  blockId: string
): boolean {
  if (!selectedThreadId) {
    return false;
  }
  const selected = getThreadAnchor(selectedThreadId);
  return selected?.kind === 'block' && selected.blockId === blockId;
}

/** math 块无法挂 PM CommentMark，用与 bn-thread-mark 同色值由组件样式承担高亮 */
export function useMathBlockCommentHighlight({
  commentEditor,
  anchor,
  revisionKey,
  hasActiveFormulaComment,
  getThreadAnchor,
}: UseMathBlockCommentHighlightOptions): { commented: boolean; selected: boolean } {
  const { selectedThreadId } = useExtensionState(CommentsExtension, { editor: commentEditor });
  const [measureRevision, setMeasureRevision] = useState(0);

  useMount(() => commentEditor.onChange(() => setMeasureRevision((revision) => revision + 1)));

  useUpdateEffect(() => {
    setMeasureRevision((revision) => revision + 1);
  }, [revisionKey, selectedThreadId]);

  void measureRevision;

  if (anchor.kind !== 'block') {
    return { commented: false, selected: false };
  }

  const commented = hasActiveFormulaComment(anchor);
  const selected = isBlockFormulaThreadSelected(selectedThreadId, getThreadAnchor, anchor.blockId);

  return { commented, selected };
}
