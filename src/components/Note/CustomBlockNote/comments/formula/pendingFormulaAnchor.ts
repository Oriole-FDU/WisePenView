import type * as Y from 'yjs';

import { WISEPEN_FORMULA_YJS_ORIGIN } from '../commentSyncGuard';
import type { FormulaThreadAnchor } from '../commentThreadConstants';

export type PendingFormulaAnchor = {
  anchor: FormulaThreadAnchor;
  existingThreadIds: Set<string>;
};

export function applyPendingFormulaAnchor(
  pendingAnchor: PendingFormulaAnchor | null,
  threadsYMap: Y.Map<unknown>,
  formulaAnchorsYMap: Y.Map<FormulaThreadAnchor>
): PendingFormulaAnchor | null {
  if (!pendingAnchor) {
    return null;
  }

  let remaining: PendingFormulaAnchor | null = pendingAnchor;

  threadsYMap.forEach((_rawThread, threadId) => {
    if (!remaining) {
      return;
    }
    const id = String(threadId);
    if (remaining.existingThreadIds.has(id)) {
      return;
    }
    const anchor = remaining.anchor;
    const doc = formulaAnchorsYMap.doc;
    if (doc) {
      doc.transact(() => {
        formulaAnchorsYMap.set(id, anchor);
      }, WISEPEN_FORMULA_YJS_ORIGIN);
    } else {
      formulaAnchorsYMap.set(id, anchor);
    }
    remaining = null;
  });

  return remaining;
}
