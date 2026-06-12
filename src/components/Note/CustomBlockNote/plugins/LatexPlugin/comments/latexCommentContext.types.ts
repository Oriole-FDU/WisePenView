import type { FormulaThreadAnchor } from '../../../comments/core/commentThreadConstants';
import type { FormulaCommentKind } from './latexCommentSupport';

export type StartFormulaCommentOptions = {
  expression: string;
  kind: FormulaCommentKind;
  shellElement: HTMLElement;
  blockId?: string;
};

export type UpdateFormulaCommentReferenceOptions = {
  anchor: FormulaThreadAnchor;
  expression: string;
  kind: FormulaCommentKind;
  persist?: boolean;
};
