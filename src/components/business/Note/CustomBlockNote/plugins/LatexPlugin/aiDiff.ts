import { isRecord } from '@/utils/typeGuards';

import type { NoteBlockAiDiff, NoteInlineAiDiff } from '../../registry/types';
import { renderKatexInto } from './katexRender';
import mathBlockStyles from './MathBlock/style.module.less';

function readExpression(value: Record<string, unknown>): string {
  const props = isRecord(value.props) ? value.props : value;
  return typeof props.expression === 'string' ? props.expression : '';
}

export const inlineMathAiDiff: NoteInlineAiDiff = {
  renderAiContent(aiContent) {
    const root = document.createElement('span');
    renderKatexInto(root, readExpression(aiContent), '', false);
    return root;
  },
};

function readMathAiContent(aiContent: unknown): string | null {
  return typeof aiContent === 'string' ? aiContent : null;
}

function renderMathBlockAiContent(aiBlock: Record<string, unknown>): HTMLElement {
  const shell = document.createElement('div');
  shell.className = `${mathBlockStyles.mathShell} ${mathBlockStyles.mathShellBlock} bn-math-block-root`;
  shell.contentEditable = 'false';
  shell.dataset.readOnly = 'true';

  const root = document.createElement('div');
  root.className = `${mathBlockStyles.mathRoot} ${mathBlockStyles.mathRootReadonly}`;
  const preview = document.createElement('div');
  preview.className = mathBlockStyles.mathPreview;
  renderKatexInto(preview, readExpression(aiBlock), mathBlockStyles.mathPlaceholder, true);
  root.appendChild(preview);
  shell.appendChild(root);
  return shell;
}

export const mathBlockAiDiff: NoteBlockAiDiff = {
  resolve(block, aiContent) {
    const aiExpression = readMathAiContent(aiContent);
    if (aiExpression === null) return null;

    const currentExpression = readExpression(block);
    if (currentExpression === aiExpression) return null;
    const props = isRecord(block.props) ? block.props : {};
    const currentEmpty = currentExpression === '';
    const aiContentEmpty = aiExpression === '';
    return {
      current: block,
      aiBlock: {
        ...block,
        props: { ...props, expression: aiExpression, autoEdit: false },
      },
      currentEmpty,
      aiContentEmpty,
      changeKind: currentEmpty ? 'create' : aiContentEmpty ? 'delete' : 'update',
    };
  },
  acceptAiContent(block, aiContent) {
    const expression = readMathAiContent(aiContent);
    if (expression === null) return null;
    const props = isRecord(block.props) ? block.props : {};
    return { props: { ...props, expression, autoEdit: false } };
  },
  renderAiContent: renderMathBlockAiContent,
};
