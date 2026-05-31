import { clearAiDiffDisplayStore } from './useAiDiffDisplayStore';
import { clearActiveDriveScopeStore } from './useActiveDriveScopeStore';
import { clearChatModelPreferenceStore } from './useChatModelPreferenceStore';
import { clearChatPanelStore } from './useChatPanelStore';
import { clearCurrentChatSessionStore } from './useCurrentChatSessionStore';
import { clearDrivePreferencesStore } from './useDrivePreferencesStore';
import { clearNewChatSessionStore } from './useNewChatSessionStore';
import { clearNewNoteStore } from './useNewNoteStore';
import { clearNoteSelectionStore } from './useNoteSelectionStore';
import { clearPdfPreviewProgressStore } from './usePdfPreviewProgressStore';
import { clearTrashTagStore } from './useTrashTagStore';
import { clearChatPageStore } from './useChatPageStore';
import { clearChatAgentStore } from './useChatAgentStore';
import { clearAdvancedModeStore } from './useAdvancedModeStore';
import { clearChatCapabilityStore } from './useChatCapabilityStore';

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
