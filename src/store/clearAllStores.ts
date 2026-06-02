import { clearActiveDriveScopeStore } from './useActiveDriveScopeStore';
import { clearAdvancedModeStore } from './useAdvancedModeStore';
import { clearAiDiffDisplayStore } from './useAiDiffDisplayStore';
import { clearChatAgentStore } from './useChatAgentStore';
import { clearChatCapabilityStore } from './useChatCapabilityStore';
import { clearChatModelPreferenceStore } from './useChatModelPreferenceStore';
import { clearChatPageStore } from './useChatPageStore';
import { clearChatPanelStore } from './useChatPanelStore';
import { clearCurrentChatSessionStore } from './useCurrentChatSessionStore';
import { clearDrivePreferencesStore } from './useDrivePreferencesStore';
import { clearNewChatSessionStore } from './useNewChatSessionStore';
import { clearNewNoteStore } from './useNewNoteStore';
import { clearNoteSelectionStore } from './useNoteSelectionStore';
import { clearPdfPreviewProgressStore } from './usePdfPreviewProgressStore';
import { clearTrashTagStore } from './useTrashTagStore';

export function clearAllZustandStores(): void {
  clearActiveDriveScopeStore();
  clearChatModelPreferenceStore();
  clearChatPanelStore();
  clearCurrentChatSessionStore();
  clearPdfPreviewProgressStore();
  clearDrivePreferencesStore();
  clearAiDiffDisplayStore();
  clearNoteSelectionStore();
  clearTrashTagStore();
  clearNewNoteStore();
  clearNewChatSessionStore();
  clearChatPageStore();
  clearChatAgentStore();
  clearAdvancedModeStore();
  clearChatCapabilityStore();
}
