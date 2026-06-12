import type { ThreadData } from '@blocknote/core/comments';
import { CommentMark } from '@blocknote/core/comments';
import type { Mark as PmMark, MarkType as PmMarkType, Node as PmNode } from '@tiptap/pm/model';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type * as Y from 'yjs';

import type { CustomBlockNoteEditor } from '../../../blockNoteSchema';
import { WISEPEN_COMMENT_MARK_SYNC_META } from '../../../comments/core/commentMarkSync';
import { WISEPEN_FORMULA_YJS_ORIGIN } from '../../../comments/core/commentSyncGuard';
import type { FormulaThreadAnchor } from '../../../comments/core/commentThreadConstants';

export const INLINE_MATH_PM_TYPE = 'inlineMath';
/** @deprecated 使用 WISEPEN_COMMENT_MARK_SYNC_META */
export const FORMULA_COMMENT_SYNC_META = WISEPEN_COMMENT_MARK_SYNC_META;

const BLOCK_CONTAINER_TYPE = 'blockContainer';
const MATH_BLOCK_PM_TYPE = 'math';

export type FormulaCommentKind = 'block' | 'inline';
export type ThreadPosition = { from: number; to: number };
export type InlineMathCommentMarkSnapshot = { threadId: string; orphan?: boolean };

export function formatFormulaReferenceText(
  expression: string,
  kind: FormulaCommentKind
): string | undefined {
  const trimmed = expression.trim();
  if (!trimmed) {
    return undefined;
  }
  return kind === 'block'
    ? formatBlockMathSelectionText(trimmed)
    : formatInlineMathSelectionText(trimmed);
}

export function selectMathBlock(editor: CustomBlockNoteEditor, blockId: string): boolean {
  const position = resolveFormulaThreadPosition(editor, { kind: 'block', blockId });
  if (position && position.from < position.to) {
    try {
      editor.transact((tr) => tr.setSelection(NodeSelection.create(tr.doc, position.from)));
      return true;
    } catch {
      // math 块若不可 node-selectable，再尝试范围选择。
    }

    try {
      editor.transact((tr) =>
        tr.setSelection(TextSelection.create(tr.doc, position.from, position.to))
      );
      return true;
    } catch {
      // 回退到 BlockNote block selection，兼容不同版本自定义块的 selection 行为。
    }
  }

  try {
    editor.setSelection(blockId, blockId);
    return true;
  } catch {
    return false;
  }
}

export function resolveInlineMathNodeAtShell(
  view: EditorView,
  shell: HTMLElement
): { node: PmNode; from: number; to: number } | null {
  try {
    const start = view.posAtDOM(shell, 0);
    const $pos = view.state.doc.resolve(start);

    if ($pos.nodeAfter?.type.name === INLINE_MATH_PM_TYPE) {
      return {
        node: $pos.nodeAfter,
        from: start,
        to: start + $pos.nodeAfter.nodeSize,
      };
    }

    if ($pos.nodeBefore?.type.name === INLINE_MATH_PM_TYPE) {
      const from = start - $pos.nodeBefore.nodeSize;
      return {
        node: $pos.nodeBefore,
        from,
        to: start,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function selectInlineMathNode(
  editor: Pick<CustomBlockNoteEditor, 'prosemirrorView' | 'transact'>,
  shell: HTMLElement
): boolean {
  const position = resolveInlineMathNodeAtShell(editor.prosemirrorView, shell);
  if (!position) {
    return false;
  }

  try {
    const { from, to } = position;
    editor.transact((tr) => tr.setSelection(TextSelection.create(tr.doc, from, to)));
    return true;
  } catch {
    return false;
  }
}

export function getInlineMathReferenceFromSelection(view: EditorView): string | undefined {
  const { from, to } = view.state.selection;
  if (from >= to) {
    return undefined;
  }

  let referenceText: string | undefined;
  view.state.doc.nodesBetween(from, to, (node) => {
    if (referenceText || node.type.name !== INLINE_MATH_PM_TYPE) {
      return;
    }
    const expression = node.attrs?.expression;
    if (typeof expression === 'string') {
      referenceText = formatFormulaReferenceText(expression, 'inline');
    }
  });

  return referenceText;
}

function formatInlineMathSelectionText(expression: string): string {
  return `$${expression.trim()}$`;
}

function formatBlockMathSelectionText(expression: string): string {
  return `$$${expression.trim()}$$`;
}

export function getFormulaAwareReferenceTextFromRange(
  doc: PmNode,
  from: number,
  to: number
): string | undefined {
  const parts: string[] = [];
  const inlineMathExpressions: string[] = [];
  const blockMathExpressions: string[] = [];
  let hasVisibleText = false;

  doc.nodesBetween(from, to, (node, pos) => {
    if (node.isText) {
      const textStart = Math.max(0, from - pos);
      const textEnd = Math.min(node.text?.length ?? 0, to - pos);
      const text = node.text?.slice(textStart, textEnd) ?? '';
      if (text.trim().length > 0) {
        hasVisibleText = true;
      }
      parts.push(text);
      return;
    }

    if (node.type.name === INLINE_MATH_PM_TYPE) {
      const expression = node.attrs?.expression;
      if (typeof expression === 'string' && expression.trim().length > 0) {
        const trimmed = expression.trim();
        inlineMathExpressions.push(trimmed);
        parts.push(formatInlineMathSelectionText(trimmed));
      }
      return false;
    }

    if (node.type.name === MATH_BLOCK_PM_TYPE) {
      const expression = node.attrs?.expression;
      if (typeof expression === 'string' && expression.trim().length > 0) {
        const trimmed = expression.trim();
        blockMathExpressions.push(trimmed);
        parts.push(formatBlockMathSelectionText(trimmed));
      }
      return false;
    }

    return undefined;
  });

  const referenceText = parts.join('').replace(/\s+/g, ' ').trim();
  if (
    !hasVisibleText &&
    inlineMathExpressions.length + blockMathExpressions.length === 1 &&
    referenceText
  ) {
    return referenceText;
  }
  return referenceText.length > 0 ? referenceText : undefined;
}

export function getFormulaAwareReferenceTextFromSelection(view: EditorView): string | undefined {
  const { from, to } = view.state.selection;
  if (from >= to) {
    return undefined;
  }

  return getFormulaAwareReferenceTextFromRange(view.state.doc, from, to);
}

type CommentsExtensionHandle = {
  startPendingComment: () => void;
};

export function getCommentsExtension(
  editor: CustomBlockNoteEditor
): CommentsExtensionHandle | undefined {
  const extension = editor.getExtension('comments') as CommentsExtensionHandle | undefined;
  if (!extension || typeof extension.startPendingComment !== 'function') {
    return undefined;
  }
  return extension;
}

function getBlockContainerId(node: PmNode): string | undefined {
  const id = node.attrs?.id;
  return typeof id === 'string' && id.length > 0 ? id : undefined;
}

function getBlockContentRange(
  blockContainer: PmNode,
  posBeforeContainer: number
): { node: PmNode; from: number; to: number } | null {
  let result: { node: PmNode; from: number; to: number } | null = null;

  blockContainer.forEach((child: PmNode, offset: number) => {
    if (child.type.spec.group !== 'blockContent') {
      return;
    }
    const from = posBeforeContainer + offset + 1;
    result = { node: child, from, to: from + child.nodeSize };
  });

  return result;
}

function findBlockContainerById(
  doc: PmNode,
  blockId: string
): { node: PmNode; posBefore: number } | null {
  let result: { node: PmNode; posBefore: number } | null = null;

  try {
    doc.descendants((node: PmNode, pos: number) => {
      if (node.type.name !== BLOCK_CONTAINER_TYPE) {
        return;
      }
      if (getBlockContainerId(node) !== blockId) {
        return;
      }
      result = { node, posBefore: pos };
      return false;
    });
  } catch {
    return null;
  }

  return result;
}

export function captureInlineMathAnchor(
  editor: Pick<CustomBlockNoteEditor, 'prosemirrorView'>,
  shell: HTMLElement
): FormulaThreadAnchor | null {
  const view = editor.prosemirrorView;

  try {
    const start = view.posAtDOM(shell, 0);
    const $pos = view.state.doc.resolve(start);
    let inlineFrom: number;

    if ($pos.nodeAfter?.type.name === INLINE_MATH_PM_TYPE) {
      inlineFrom = start;
    } else if ($pos.nodeBefore?.type.name === INLINE_MATH_PM_TYPE) {
      inlineFrom = start - $pos.nodeBefore.nodeSize;
    } else {
      return null;
    }

    let parentContainer: { node: PmNode; posBefore: number } | null = null;
    view.state.doc.nodesBetween(0, view.state.doc.content.size, (node: PmNode, pos: number) => {
      if (node.type.name !== BLOCK_CONTAINER_TYPE) {
        return;
      }
      const end = pos + node.nodeSize;
      if (inlineFrom >= pos && inlineFrom < end) {
        parentContainer = { node, posBefore: pos };
        return false;
      }
      return undefined;
    });

    if (!parentContainer) {
      return null;
    }

    const { node: containerNode, posBefore } = parentContainer;
    const blockId = getBlockContainerId(containerNode);
    if (!blockId) {
      return null;
    }

    const content = getBlockContentRange(containerNode, posBefore);
    if (!content) {
      return null;
    }

    let inlineIndex = 0;
    let matchedIndex: number | null = null;

    content.node.forEach((child: PmNode, offset: number) => {
      if (child.type.name !== INLINE_MATH_PM_TYPE) {
        return;
      }
      const childFrom = content.from + offset + 1;
      if (childFrom === inlineFrom) {
        matchedIndex = inlineIndex;
      }
      inlineIndex += 1;
    });

    if (matchedIndex === null) {
      return null;
    }

    return {
      kind: 'inline',
      blockId,
      inlineIndex: matchedIndex,
    };
  } catch {
    return null;
  }
}

export function resolveFormulaThreadPosition(
  editor: CustomBlockNoteEditor,
  anchor: FormulaThreadAnchor
): ThreadPosition | null {
  const doc = editor.prosemirrorView.state.doc;

  if (anchor.kind === 'block') {
    const container = findBlockContainerById(doc, anchor.blockId);
    if (!container) {
      return null;
    }
    const content = getBlockContentRange(container.node, container.posBefore);
    if (!content || content.node.type.name !== 'math') {
      return null;
    }
    return { from: content.from, to: content.to };
  }

  const container = findBlockContainerById(doc, anchor.blockId);
  if (!container) {
    return null;
  }
  const content = getBlockContentRange(container.node, container.posBefore);
  if (!content) {
    return null;
  }

  let inlineIndex = 0;
  let resolved: ThreadPosition | null = null;

  content.node.forEach((child, offset) => {
    if (resolved || child.type.name !== INLINE_MATH_PM_TYPE) {
      return;
    }
    if (inlineIndex === anchor.inlineIndex) {
      const from = content.from + offset + 1;
      resolved = { from, to: from + child.nodeSize };
    }
    inlineIndex += 1;
  });

  return resolved;
}

export function resolveAllFormulaThreadPositions(
  editor: CustomBlockNoteEditor,
  formulaAnchorsYMap: Y.Map<FormulaThreadAnchor>
): Map<string, ThreadPosition> {
  const positions = new Map<string, ThreadPosition>();

  formulaAnchorsYMap.forEach((anchor, threadId) => {
    const position = resolveFormulaThreadPosition(editor, anchor);
    if (position) {
      positions.set(String(threadId), position);
    }
  });

  return positions;
}

function getCommentMarkType(editor: CustomBlockNoteEditor) {
  return editor.prosemirrorView.state.schema.marks[CommentMark.name];
}

function formulaMarkExists(
  doc: PmNode,
  markType: PmMarkType,
  threadId: string,
  from: number,
  to: number
): boolean {
  let found = false;

  doc.nodesBetween(from, to, (node: PmNode) => {
    if (found) {
      return;
    }
    if (
      node.marks.some(
        (mark: PmMark) =>
          mark.type === markType && mark.attrs.threadId === threadId && mark.attrs.orphan !== true
      )
    ) {
      found = true;
    }
  });

  return found;
}

export function applyFormulaThreadMark(
  editor: CustomBlockNoteEditor,
  threadId: string,
  position: ThreadPosition
): boolean {
  const markType = getCommentMarkType(editor);
  if (!markType) {
    return false;
  }

  const { from, to } = position;
  if (from >= to) {
    return false;
  }

  const doc = editor.prosemirrorView.state.doc;
  if (formulaMarkExists(doc, markType, threadId, from, to)) {
    return true;
  }

  editor.transact((tr) => {
    tr.setMeta(WISEPEN_COMMENT_MARK_SYNC_META, true);
    tr.removeMark(from, to, markType);
    tr.addMark(from, to, markType.create({ threadId, orphan: false }));
  });

  return formulaMarkExists(editor.prosemirrorView.state.doc, markType, threadId, from, to);
}

export function isThreadActive(thread: ThreadData | undefined): boolean {
  return Boolean(thread && !thread.deletedAt && !thread.resolved);
}

export function pruneFormulaThreadAnchors(
  formulaAnchorsYMap: Y.Map<FormulaThreadAnchor>,
  threadsYMap: Y.Map<unknown>
) {
  const prunedIds: string[] = [];
  formulaAnchorsYMap.forEach((_anchor, threadId) => {
    const thread = threadsYMap.get(threadId) as ThreadData | undefined;
    if (!isThreadActive(thread)) {
      prunedIds.push(String(threadId));
    }
  });
  if (prunedIds.length > 0) {
    const doc = formulaAnchorsYMap.doc;
    const prune = () => {
      prunedIds.forEach((threadId) => {
        formulaAnchorsYMap.delete(threadId);
      });
    };
    if (doc) {
      doc.transact(prune, WISEPEN_FORMULA_YJS_ORIGIN);
    } else {
      prune();
    }
  }
}

/** 按 Yjs 锚点把 CommentMark 同步到公式 PM 节点，高亮由正文 bn-thread-mark 样式负责 */
export function syncFormulaThreadMarks(
  editor: CustomBlockNoteEditor,
  formulaAnchorsYMap: Y.Map<FormulaThreadAnchor>,
  threadsYMap: Y.Map<unknown>,
  unmarkableThreadIds?: Set<string>
) {
  pruneFormulaThreadAnchors(formulaAnchorsYMap, threadsYMap);

  formulaAnchorsYMap.forEach((anchor, threadId) => {
    const id = String(threadId);
    const thread = threadsYMap.get(threadId) as ThreadData | undefined;
    if (!isThreadActive(thread)) {
      unmarkableThreadIds?.delete(id);
      return;
    }

    if (anchor.kind === 'block') {
      unmarkableThreadIds?.delete(id);
      return;
    }

    const position = resolveFormulaThreadPosition(editor, anchor);
    if (!position) {
      return;
    }

    if (unmarkableThreadIds?.has(id)) {
      return;
    }

    const attached = applyFormulaThreadMark(editor, id, position);
    if (!attached) {
      unmarkableThreadIds?.add(id);
    }
  });
}

export function updateFormulaThreadReferences(
  editor: CustomBlockNoteEditor,
  formulaAnchorsYMap: Y.Map<FormulaThreadAnchor>,
  threadReferencesYMap: Y.Map<string>
) {
  formulaAnchorsYMap.forEach((anchor, threadId) => {
    const id = String(threadId);

    if (anchor.kind === 'block') {
      const block = editor.getBlock(anchor.blockId);
      if (block?.type === 'math' && typeof block.props.expression === 'string') {
        const referenceText = formatFormulaReferenceText(block.props.expression, 'block');
        if (referenceText && threadReferencesYMap.get(id) !== referenceText) {
          threadReferencesYMap.set(id, referenceText);
        }
      }
      return;
    }

    const position = resolveFormulaThreadPosition(editor, anchor);
    if (!position) {
      return;
    }

    let expression: string | undefined;
    editor.prosemirrorView.state.doc.nodesBetween(position.from, position.to, (node) => {
      if (expression || node.type.name !== INLINE_MATH_PM_TYPE) {
        return;
      }
      if (typeof node.attrs?.expression === 'string') {
        expression = node.attrs.expression;
      }
    });

    if (expression) {
      const referenceText = formatFormulaReferenceText(expression, 'inline');
      if (referenceText && threadReferencesYMap.get(id) !== referenceText) {
        threadReferencesYMap.set(id, referenceText);
      }
    }
  });
}
