export {
  getFormulaCommentReferenceText,
  isSameFormulaThreadAnchor,
} from './formulaCommentReference';
export {
  LatexCommentProvider,
  useLatexComment,
  type LatexCommentContextValue,
} from './latexCommentContext';
export type {
  StartFormulaCommentOptions,
  UpdateFormulaCommentReferenceOptions,
} from './latexCommentContext.types';
export {
  INLINE_MATH_PM_TYPE,
  applyFormulaThreadMark,
  captureInlineMathAnchor,
  formatFormulaReferenceText,
  getCommentsExtension,
  getFormulaAwareReferenceTextFromRange,
  getFormulaAwareReferenceTextFromSelection,
  getInlineMathReferenceFromSelection,
  isThreadActive,
  pruneFormulaThreadAnchors,
  resolveAllFormulaThreadPositions,
  resolveFormulaThreadPosition,
  resolveInlineMathNodeAtShell,
  selectInlineMathNode,
  selectMathBlock,
  syncFormulaThreadMarks,
  updateFormulaThreadReferences,
  type FormulaCommentKind,
  type ThreadPosition as FormulaThreadPosition,
  type InlineMathCommentMarkSnapshot,
} from './latexCommentSupport';
export { LatexFormulaCommentButton } from './LatexFormulaCommentButton';
export { applyPendingFormulaAnchor, type PendingFormulaAnchor } from './pendingFormulaAnchor';
export { useFormulaComments, type UseFormulaCommentsOptions } from './useFormulaComments';
export { useMathBlockCommentHighlight } from './useMathBlockThreadMarkClasses';
