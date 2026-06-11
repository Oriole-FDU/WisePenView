import { NodeSelection } from '@tiptap/pm/state';

import type { CustomBlockNoteEditor } from '../blockNoteSchema';
import { INLINE_MATH_PM_TYPE } from './formula/latexCommentSupport';

const AI_DIFF_INLINE_TYPES = new Set([
  'ai-diff',
  'ai-add',
  'ai-delete',
  'ai-link-add',
  'ai-link-delete',
]);

const AI_DIFF_PROP_TYPES = new Set(['edit', 'create', 'delete']);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function getType(v: unknown): string | undefined {
  if (!isRecord(v)) return undefined;
  const type = v['type'];
  return typeof type === 'string' ? type : undefined;
}

function getProps(v: unknown): Record<string, unknown> | undefined {
  if (!isRecord(v)) return undefined;
  const props = v['props'];
  return isRecord(props) ? props : undefined;
}

function hasAiDiffProps(v: unknown): boolean {
  const props = getProps(v);
  const aiDiffType = props?.['aiDiffType'];
  return typeof aiDiffType === 'string' && AI_DIFF_PROP_TYPES.has(aiDiffType);
}

function hasAiDiffInlineContent(content: unknown): boolean {
  if (!Array.isArray(content)) return false;
  return content.some(hasAiDiffNode);
}

function hasAiDiffNode(node: unknown): boolean {
  const type = getType(node);
  if (type && AI_DIFF_INLINE_TYPES.has(type)) return true;
  if (hasAiDiffProps(node)) return true;

  if (!isRecord(node)) return false;
  return hasAiDiffInlineContent(node['content']);
}

export function blockHasAiDiff(block: unknown): boolean {
  if (hasAiDiffNode(block)) return true;
  if (!isRecord(block)) return false;

  const children = block['children'];
  return Array.isArray(children) && children.some(blockHasAiDiff);
}

function selectionBlocksHaveAiDiff(editor: CustomBlockNoteEditor): boolean {
  try {
    const selectedBlocks = editor.getSelection()?.blocks;
    if (selectedBlocks?.some((block) => blockHasAiDiff(block))) {
      return true;
    }
  } catch {
    // Some custom block selections don't map cleanly to BlockNote selection.
  }

  try {
    const cursorBlock = editor.getTextCursorPosition().block;
    if (blockHasAiDiff(cursorBlock)) {
      return true;
    }
  } catch {
    // No text cursor position for the current selection.
  }

  return false;
}

function prosemirrorSelectionHasAiDiffInline(editor: CustomBlockNoteEditor): boolean {
  const { selection, doc } = editor.prosemirrorView.state;
  if (selection.empty) {
    return false;
  }

  let hasAiDiff = false;
  doc.nodesBetween(selection.from, selection.to, (node) => {
    if (AI_DIFF_INLINE_TYPES.has(node.type.name)) {
      hasAiDiff = true;
      return false;
    }
    return !hasAiDiff;
  });
  return hasAiDiff;
}

/** 当前选区是否允许创建批注（AIDiff 块/行内内容不可批注） */
export function isCommentableSelection(editor: CustomBlockNoteEditor): boolean {
  if (selectionBlocksHaveAiDiff(editor)) {
    return false;
  }
  if (prosemirrorSelectionHasAiDiffInline(editor)) {
    return false;
  }
  return true;
}

function selectionInvolvesInlineMath(editor: CustomBlockNoteEditor): boolean {
  const { selection, doc } = editor.prosemirrorView.state;

  if (selection instanceof NodeSelection && selection.node.type.name === INLINE_MATH_PM_TYPE) {
    return true;
  }

  const { from, to } = selection;
  if (from < to) {
    let found = false;
    doc.nodesBetween(from, to, (node) => {
      if (node.type.name === INLINE_MATH_PM_TYPE) {
        found = true;
      }
    });
    if (found) {
      return true;
    }
  }

  const $from = doc.resolve(from);
  if ($from.nodeAfter?.type.name === INLINE_MATH_PM_TYPE) {
    return true;
  }
  if ($from.nodeBefore?.type.name === INLINE_MATH_PM_TYPE) {
    return true;
  }

  return false;
}

/** math / inlineMath 选中时不显示正文 formatting toolbar，与公式批注入口互斥 */
export function shouldHideFormattingToolbarForMathBlock(editor: CustomBlockNoteEditor): boolean {
  if (selectionInvolvesInlineMath(editor)) {
    return true;
  }

  const { selection, doc } = editor.prosemirrorView.state;

  if (!selection.empty) {
    const selectedNode = doc.nodeAt(selection.from);
    if (
      selectedNode?.type.name === 'math' &&
      selection.to <= selection.from + selectedNode.nodeSize
    ) {
      return true;
    }
  }

  try {
    const selectedBlocks = editor.getSelection()?.blocks;
    if (selectedBlocks?.length === 1 && selectedBlocks[0].type === 'math') {
      return true;
    }
  } catch {
    // Some custom block selections don't map cleanly to BlockNote selection.
  }

  try {
    return editor.getTextCursorPosition().block.type === 'math';
  } catch {
    return false;
  }
}
