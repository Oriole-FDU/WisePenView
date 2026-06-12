export {
  BLOCKNOTE_YJS_COMMENT_SETTINGS_MAP,
  DEFAULT_COMMENT_SETTINGS,
  getBlockNoteCommentSettingsYMap,
  getCommentSettingsFromDoc,
  readCommentSettings,
  setCommentSettingsOnDoc,
  type CollaboratorCommentVisibility,
  type CommentSettings,
} from './core/commentSettings';

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
} from './core/commentThreadConstants';

export { ReadOnlyThreadStoreAuth } from './core/readOnlyThreadStoreAuth';

export {
  filterThreadsByVisibility,
  isThreadVisibleToUser,
  isUserParticipantInThread,
  type ThreadVisibilityContext,
} from './core/threadVisibility';

export {
  blockHasAiDiff,
  isCommentableSelection,
  shouldHideFormattingToolbarForMathBlock,
} from './core/isCommentableSelection';

export {
  DEFAULT_COMMENTS_SIDEBAR_WIDTH,
  MAX_COMMENTS_SIDEBAR_WIDTH,
  MIN_COMMENTS_SIDEBAR_WIDTH,
  normalizeCommentsSidebarWidth,
  useCommentsSidebarResize,
  type UseCommentsSidebarResizeOptions,
  type UseCommentsSidebarResizeResult,
} from './hooks/useCommentsSidebarResize';

export {
  normalizeAvatarUrl,
  type CommentUserDisplay,
  type CommentUserProfile,
} from './core/commentUserProfile';

export {
  filterThreadsByResolvedState,
  getStoredThreadReferenceText,
  getThreadReferenceText,
  sortCommentThreads,
  type ThreadPosition,
  type ThreadResolvedFilter,
} from './core/threadReferenceText';

export {
  CommentsExtension,
  addCommentMarkToDocumentSelection,
  buildCommentsExtension,
  type AddThreadToDocumentArgs,
  type BuildCommentsExtensionOptions,
} from './hooks/useCommentsExtension';

export type { BlockNoteCommentDocumentRole, CommentUserDisplayRecord } from './comments.types';

export { CommentsSidebarPanel, type CommentsSidebarPanelProps } from './ui/CommentsSidebarPanel';

export {
  CustomThreadsSidebar,
  type CustomThreadsSidebarProps,
} from './ui/threadsSidebar/CustomThreadsSidebar';

export { CustomThreadItem } from './ui/threadsSidebar/CustomThreadItem';

export { NoteCommentsUi } from './ui/NoteCommentsUi';
export type { NoteCommentsUiProps } from './ui/NoteCommentsUi';

export {
  resolveActiveCommentUserProfile,
  resolveBlockNoteCommentUsers,
} from './core/commentUserProfile';

export {
  LatexCommentProvider,
  LatexFormulaCommentButton,
  getFormulaCommentReferenceText,
  useFormulaComments,
  useLatexComment,
} from '../plugins/LatexPlugin/comments';

export {
  applyPendingCommentReference,
  capturePendingCommentSelection,
  type PendingCommentReference,
  type PendingCommentSelection,
} from './core/pendingCommentReference';

export { useCommentSettingsSync } from './hooks/useCommentSettingsSync';
export { useSyncCommentDocumentMarks } from './hooks/useSyncCommentDocumentMarks';

export { buildPrintCommentsSection } from './core/buildPrintCommentsSection';

export { default as commentStyles } from './ui/commentStyles.module.less';
