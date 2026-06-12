import { createContext, createElement, use, type ReactNode } from 'react';

import type { CustomBlockNoteEditor } from '../../../blockNoteSchema';
import type { FormulaThreadAnchor } from '../../../comments/core/commentThreadConstants';
import type {
  StartFormulaCommentOptions,
  UpdateFormulaCommentReferenceOptions,
} from './latexCommentContext.types';

export type {
  StartFormulaCommentOptions,
  UpdateFormulaCommentReferenceOptions,
} from './latexCommentContext.types';

export type LatexCommentContextValue = {
  canComment: boolean;
  startFormulaComment: (options: StartFormulaCommentOptions) => void;
  updateFormulaCommentReference: (options: UpdateFormulaCommentReferenceOptions) => void;
  clearFormulaCommentReferenceOverride: (anchor: FormulaThreadAnchor) => void;
  selectedThreadId?: string;
  commentEditor: CustomBlockNoteEditor | null;
  hasActiveFormulaComment: (anchor: FormulaThreadAnchor) => boolean;
  isFormulaThreadSelected: (anchor: FormulaThreadAnchor) => boolean;
  getThreadAnchor: (threadId: string) => FormulaThreadAnchor | undefined;
};

const LatexCommentContext = createContext<LatexCommentContextValue | null>(null);

export function LatexCommentProvider({
  canComment,
  startFormulaComment,
  updateFormulaCommentReference,
  clearFormulaCommentReferenceOverride,
  selectedThreadId,
  commentEditor,
  hasActiveFormulaComment,
  isFormulaThreadSelected,
  getThreadAnchor,
  children,
}: LatexCommentContextValue & { children: ReactNode }) {
  return createElement(
    LatexCommentContext.Provider,
    {
      value: {
        canComment,
        startFormulaComment,
        updateFormulaCommentReference,
        clearFormulaCommentReferenceOverride,
        selectedThreadId,
        commentEditor,
        hasActiveFormulaComment,
        isFormulaThreadSelected,
        getThreadAnchor,
      },
    },
    children
  );
}

export function useLatexComment() {
  return use(LatexCommentContext);
}
