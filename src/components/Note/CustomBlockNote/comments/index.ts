export {
  BLOCKNOTE_YJS_COMMENT_SETTINGS_MAP,
  DEFAULT_COMMENT_SETTINGS,
  getBlockNoteCommentSettingsYMap,
  getCommentSettingsFromDoc,
  readCommentSettings,
  setCommentSettingsOnDoc,
  type CollaboratorCommentVisibility,
  type CommentSettings,
} from './commentSettings';

export {
  BLOCKNOTE_YJS_COMMENT_USERS_MAP,
  BLOCKNOTE_YJS_FORMULA_THREAD_ANCHORS_MAP,
  BLOCKNOTE_YJS_THREADS_MAP,
  BLOCKNOTE_YJS_THREAD_REFERENCES_MAP,
  getBlockNoteCommentUsersYMap,
  getBlockNoteFormulaThreadAnchorsYMap,
  getBlockNoteThreadReferencesYMap,
  getBlockNoteThreadsYMap,
  type FormulaThreadAnchor,
} from './commentThreadConstants';

export { ReadOnlyThreadStoreAuth } from './readOnlyThreadStoreAuth';

export {
  filterThreadsByVisibility,
  isThreadVisibleToUser,
  isUserParticipantInThread,
  type ThreadVisibilityContext,
} from './threadVisibility';

export {
  blockHasAiDiff,
  isCommentableSelection,
  shouldHideFormattingToolbarForMathBlock,
} from './isCommentableSelection';

export {
  DEFAULT_COMMENTS_SIDEBAR_WIDTH,
  MAX_COMMENTS_SIDEBAR_WIDTH,
  MIN_COMMENTS_SIDEBAR_WIDTH,
  normalizeCommentsSidebarWidth,
  useCommentsSidebarResize,
  type UseCommentsSidebarResizeOptions,
  type UseCommentsSidebarResizeResult,
} from './useCommentsSidebarResize';

export {
  normalizeAvatarUrl,
  type CommentUserDisplay,
  type CommentUserProfile,
} from './commentUserProfile';

export {
  filterThreadsByResolvedState,
  getStoredThreadReferenceText,
  getThreadReferenceText,
  sortCommentThreads,
  type ThreadPosition,
  type ThreadResolvedFilter,
} from './threadReferenceText';

export {
  CommentsExtension,
  addCommentMarkToDocumentSelection,
  buildCommentsExtension,
  type AddThreadToDocumentArgs,
  type BuildCommentsExtensionOptions,
} from './useCommentsExtension';

export type { BlockNoteCommentDocumentRole, CommentUserDisplayRecord } from './comments.types';

export { CommentsSidebarPanel, type CommentsSidebarPanelProps } from './CommentsSidebarPanel';

export {
  CustomThreadsSidebar,
  type CustomThreadsSidebarProps,
} from './threadsSidebar/CustomThreadsSidebar';

export { CustomThreadItem } from './threadsSidebar/CustomThreadItem';

export { NoteCommentsUi } from './NoteCommentsUi';
export type { NoteCommentsUiProps } from './NoteCommentsUi';

export {
  resolveActiveCommentUserProfile,
  resolveBlockNoteCommentUsers,
} from './commentUserProfile';

export { getFormulaCommentReferenceText } from './formula/formulaCommentReference';
export { LatexCommentProvider, useLatexComment } from './formula/latexCommentContext';
export { LatexFormulaCommentButton } from './formula/LatexFormulaCommentButton';
export { useFormulaComments } from './formula/useFormulaComments';

export {
  applyPendingCommentReference,
  capturePendingCommentSelection,
  type PendingCommentReference,
  type PendingCommentSelection,
} from './pendingCommentReference';

export { useCommentSettingsSync } from './useCommentSettingsSync';
export { useSyncCommentDocumentMarks } from './useSyncCommentDocumentMarks';

export { buildPrintCommentsSection } from './buildPrintCommentsSection';

export { default as commentStyles } from './commentStyles.module.less';
