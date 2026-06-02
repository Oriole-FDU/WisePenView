import { create } from 'zustand';

export interface ActiveDocRef {
  resourceId: string;
  resourceName: string;
  enabled: boolean;
}

export interface ActiveAttachment {
  attachmentId: string;
  filename: string;
  enabled: boolean;
}

interface ChatPageState {
  activeDocRefs: ActiveDocRef[];
  activeAttachments: ActiveAttachment[];

  addDocRef: (ref: ActiveDocRef) => void;
  removeDocRef: (resourceId: string) => void;
  setDocRefEnabled: (resourceId: string, enabled: boolean) => void;
  addAttachment: (att: ActiveAttachment) => void;
  removeAttachment: (attachmentId: string) => void;
  setAttachmentEnabled: (attachmentId: string, enabled: boolean) => void;
  autoSaveToLibrary: boolean;
  setAutoSaveToLibrary: (value: boolean) => void;
}

const initialState = {
  activeDocRefs: [],
  activeAttachments: [],
  autoSaveToLibrary: false,
};

export const useChatPageStore = create<ChatPageState>()((set) => ({
  ...initialState,

  addDocRef: (ref) =>
    set((state) => ({
      activeDocRefs: state.activeDocRefs.some((r) => r.resourceId === ref.resourceId)
        ? state.activeDocRefs
        : [...state.activeDocRefs, ref],
    })),

  removeDocRef: (resourceId) =>
    set((state) => ({
      activeDocRefs: state.activeDocRefs.filter((r) => r.resourceId !== resourceId),
    })),

  setDocRefEnabled: (resourceId, enabled) =>
    set((state) => ({
      activeDocRefs: state.activeDocRefs.map((r) =>
        r.resourceId === resourceId ? { ...r, enabled } : r
      ),
    })),

  addAttachment: (att) =>
    set((state) => ({
      activeAttachments: state.activeAttachments.some((a) => a.attachmentId === att.attachmentId)
        ? state.activeAttachments
        : [...state.activeAttachments, att],
    })),

  removeAttachment: (attachmentId) =>
    set((state) => ({
      activeAttachments: state.activeAttachments.filter((a) => a.attachmentId !== attachmentId),
    })),

  setAttachmentEnabled: (attachmentId, enabled) =>
    set((state) => ({
      activeAttachments: state.activeAttachments.map((a) =>
        a.attachmentId === attachmentId ? { ...a, enabled } : a
      ),
    })),

  autoSaveToLibrary: false,
  setAutoSaveToLibrary: (value) => set({ autoSaveToLibrary: value }),
}));

export const clearChatPageStore = (): void => {
  useChatPageStore.setState({
    activeDocRefs: [],
    activeAttachments: [],
    autoSaveToLibrary: false,
  });
};
