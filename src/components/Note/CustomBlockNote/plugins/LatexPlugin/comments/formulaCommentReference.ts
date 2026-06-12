import type { CustomBlockNoteEditor } from '../../../blockNoteSchema';
import type { FormulaThreadAnchor } from '../../../comments/core/commentThreadConstants';
import {
  formatFormulaReferenceText,
  getFormulaAwareReferenceTextFromSelection,
  getInlineMathReferenceFromSelection,
} from './latexCommentSupport';

export function isSameFormulaThreadAnchor(a: FormulaThreadAnchor, b: FormulaThreadAnchor) {
  if (a.kind !== b.kind || a.blockId !== b.blockId) {
    return false;
  }
  if (a.kind === 'block') {
    return true;
  }
  return a.inlineIndex === b.inlineIndex;
}

export function getFormulaCommentReferenceText(editor: CustomBlockNoteEditor): string | undefined {
  try {
    const referenceText = getFormulaAwareReferenceTextFromSelection(editor.prosemirrorView);
    if (referenceText) {
      return referenceText;
    }
  } catch {
    // Selection may not be available for the current cursor state.
  }

  try {
    const inlineReference = getInlineMathReferenceFromSelection(editor.prosemirrorView);
    if (inlineReference) {
      return inlineReference;
    }
  } catch {
    // Inline math selection may not be available for the current cursor state.
  }

  const getMathExpression = (block: { type: string; props?: Record<string, unknown> }) => {
    if (block.type !== 'math') {
      return undefined;
    }
    const expression = block.props?.expression;
    return typeof expression === 'string' && expression.trim().length > 0 ? expression : undefined;
  };

  try {
    const selectedMathExpression = editor
      .getSelection()
      ?.blocks.map((block) => getMathExpression(block))
      .find(Boolean);
    if (selectedMathExpression) {
      return formatFormulaReferenceText(selectedMathExpression, 'block');
    }
  } catch {
    // Node selections on content-less custom blocks may not map to a BlockNote selection.
  }

  try {
    const cursorBlock = editor.getTextCursorPosition().block;
    const cursorMathExpression = getMathExpression(cursorBlock);
    if (cursorMathExpression) {
      return formatFormulaReferenceText(cursorMathExpression, 'block');
    }
  } catch {
    // No text cursor position for the current selection.
  }

  return undefined;
}
