/**
 * Store 统一入口
 *
 * - zustand.ts + use*Store.ts: 内存状态管理，默认承载 UI 状态与临时数据
 * - 少数领域 session/cache store 可由 service 读写，用于删除、登出等跨模块一致性同步
 */

// Zustand stores
export {
  clearActiveDriveScopeStore,
  clearAdvancedModeStore,
  clearAiDiffDisplayStore,
  clearAllZustandStores,
  clearChatAgentStore,
  clearChatCapabilityStore,
  clearChatPageStore,
  clearChatPanelStore,
  clearCurrentChatSessionStore,
  clearDrivePreferencesStore,
  clearNewChatSessionStore,
  clearNewNoteStore,
  clearNoteSelectionStore,
  clearPdfPreviewProgressStore,
  clearResourceDisplayNameStore,
  clearTrashTagStore,
  useActiveDriveScopeStore,
  useAdvancedModeStore,
  useAiDiffDisplayStore,
  useChatAgentStore,
  useChatCapabilityStore,
  useChatPageStore,
  useChatPanelStore,
  useCurrentChatSessionStore,
  useDrivePreferencesStore,
  useNewChatSessionStore,
  useNewNoteStore,
  useNoteSelectionStore,
  usePdfPreviewProgressStore,
  useResourceDisplayNameStore,
  useTrashTagStore,
  type ActiveAttachment,
  type ActiveDocRef,
  type ChatAgentOption,
  type ChatAgentType,
  type DriveViewMode,
  type PdfPreviewProgress,
  type TemporarySkillSelection,
  type TemporaryToolSelection,
} from './zustand';

export {
  clearNoteCommentsSidebarStore,
  useNoteCommentsSidebarStore,
} from './useNoteCommentsSidebarStore';
