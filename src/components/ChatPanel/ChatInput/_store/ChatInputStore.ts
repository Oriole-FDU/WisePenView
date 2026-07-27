import {
  buildDefaultPersonalAgent,
  type CapabilitySkillSelection,
  type CapabilityToolOption,
  type ChatAgentOption,
  type ChatModel,
} from '@/domains/Chat';
import type { ResourceSkillSummary } from '@/domains/Resource';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type {
  LocalAttachmentPayload,
  LocalAttachmentUpload,
  LocalPendingImageMeta,
  LocalResourcePayload,
} from '../index.type';

const DEFAULT_PERSONAL_AGENT = buildDefaultPersonalAgent();

function buildSkillSelection(
  skill: ResourceSkillSummary,
  options?: { sourceAgent?: ChatAgentOption | null; external?: boolean }
): CapabilitySkillSelection {
  const sourceAgent = options?.sourceAgent;
  const external =
    options?.external ??
    (Boolean(sourceAgent) &&
      (sourceAgent?.agentType === 'GROUP'
        ? sourceAgent.groupId !== skill.groupId
        : skill.scopeType === 'GROUP'));

  return {
    skillId: skill.skillId,
    displayName: skill.displayName,
    currentVersionId: skill.currentVersionId,
    scopeType: skill.scopeType,
    groupId: skill.groupId,
    groupName: skill.groupName,
    sourceAgentId: sourceAgent?.agentId,
    sourceAgentLabel: sourceAgent?.label,
    external,
  };
}

interface ChatInputCompletionState {
  value: string;
  selectedModelId: string | null;
  selectedAgent: ChatAgentOption;
  selectedSkills: CapabilitySkillSelection[];
  selectedTools: CapabilityToolOption[];
  activeDocRefs: LocalResourcePayload[];
  activeAttachments: LocalAttachmentPayload[];
  pendingImageMetas: LocalPendingImageMeta[];
}

interface ChatInputState {
  activeDocRefs: LocalResourcePayload[];
  activeAttachments: LocalAttachmentPayload[];
  attachmentOpen: boolean;
  availableModels: ChatModel[];
  documentPickerOpen: boolean;
  isComposing: boolean;
  isDragOver: boolean;
  modelOpen: boolean;
  otherSkillModalOpen: boolean;
  pendingAttachmentUploads: LocalAttachmentUpload[];
  pendingImageMetas: LocalPendingImageMeta[];
  selectedAgent: ChatAgentOption;
  selectedModelId: string | null;
  selectedSkills: CapabilitySkillSelection[];
  selectedTools: CapabilityToolOption[];
  skillMenuOpen: boolean;
  value: string;
}

interface ChatInputActions {
  addActiveAttachment: (attachment: LocalAttachmentPayload) => void;
  addDocRefs: (resources: LocalResourcePayload[]) => void;
  addPendingAttachmentUpload: (upload: LocalAttachmentUpload) => void;
  addPendingImageMeta: (meta: LocalPendingImageMeta) => void;
  clearAfterSend: () => void;
  clearCapabilities: () => void;
  removeActiveAttachment: (attachmentId: string) => void;
  removeDocRef: (resourceId: string) => void;
  removePendingAttachmentUpload: (id: string) => void;
  removePendingImageMeta: (id: string) => void;
  removeSkill: (skillId: string) => void;
  removeTool: (toolId: string) => void;
  replaceAgentIfMissing: (fallbackAgent: ChatAgentOption) => void;
  replaceExternalSkills: (
    selected: Array<{ skill: ResourceSkillSummary; sourceAgent: ChatAgentOption | null }>
  ) => void;
  setAttachmentOpen: (open: boolean) => void;
  setAvailableModels: (models: ChatModel[]) => void;
  setDocumentPickerOpen: (open: boolean) => void;
  setIsComposing: (isComposing: boolean) => void;
  setIsDragOver: (isDragOver: boolean) => void;
  setModelOpen: (open: boolean) => void;
  setOtherSkillModalOpen: (open: boolean) => void;
  setPendingAttachmentUploadStatus: (id: string, status: LocalAttachmentUpload['status']) => void;
  setPendingAttachmentUploadFailed: (id: string) => void;
  setSelectedAgent: (agent: ChatAgentOption) => void;
  setSelectedModelId: (modelId: string | null) => void;
  setSkillMenuOpen: (open: boolean) => void;
  setValue: (value: string) => void;
  toggleSkill: (skill: ResourceSkillSummary, sourceAgent: ChatAgentOption) => void;
  toggleTool: (tool: CapabilityToolOption) => void;
}

type ChatInputStoreState = ChatInputState & ChatInputActions;
type ChatInputStoreApi = StoreApi<ChatInputStoreState>;

export const ChatInputStoreContext = createContext<ChatInputStoreApi | null>(null);

const INITIAL_STATE: ChatInputState = {
  activeDocRefs: [],
  activeAttachments: [],
  attachmentOpen: false,
  availableModels: [],
  documentPickerOpen: false,
  isComposing: false,
  isDragOver: false,
  modelOpen: false,
  otherSkillModalOpen: false,
  pendingAttachmentUploads: [],
  pendingImageMetas: [],
  selectedAgent: DEFAULT_PERSONAL_AGENT,
  selectedModelId: null,
  selectedSkills: [],
  selectedTools: [],
  skillMenuOpen: false,
  value: '',
};

export function createChatInputStore(): ChatInputStoreApi {
  return createStore<ChatInputStoreState>()((set) => ({
    ...INITIAL_STATE,

    addActiveAttachment: (attachment) =>
      set((state) => ({
        activeAttachments: state.activeAttachments.some(
          (item) => item.attachmentId === attachment.attachmentId
        )
          ? state.activeAttachments
          : [...state.activeAttachments, attachment],
      })),

    addDocRefs: (resources) =>
      set((state) => {
        const existingIds = new Set(state.activeDocRefs.map((resource) => resource.resourceId));
        const additions = resources.filter((resource) => !existingIds.has(resource.resourceId));
        return { activeDocRefs: [...state.activeDocRefs, ...additions] };
      }),

    addPendingAttachmentUpload: (upload) =>
      set((state) => ({
        pendingAttachmentUploads: [...state.pendingAttachmentUploads, upload],
      })),

    addPendingImageMeta: (meta) =>
      set((state) => ({
        pendingImageMetas: [...state.pendingImageMetas, meta],
      })),

    clearAfterSend: () =>
      set({
        activeDocRefs: [],
        activeAttachments: [],
        pendingAttachmentUploads: [],
        pendingImageMetas: [],
        selectedSkills: [],
        selectedTools: [],
        value: '',
      }),

    clearCapabilities: () =>
      set({
        selectedSkills: [],
        selectedTools: [],
      }),

    removeActiveAttachment: (attachmentId) =>
      set((state) => ({
        activeAttachments: state.activeAttachments.filter(
          (attachment) => attachment.attachmentId !== attachmentId
        ),
      })),

    removeDocRef: (resourceId) =>
      set((state) => ({
        activeDocRefs: state.activeDocRefs.filter((resource) => resource.resourceId !== resourceId),
      })),

    removePendingAttachmentUpload: (id) =>
      set((state) => ({
        pendingAttachmentUploads: state.pendingAttachmentUploads.filter(
          (upload) => upload.id !== id
        ),
      })),

    removePendingImageMeta: (id) =>
      set((state) => ({
        pendingImageMetas: state.pendingImageMetas.filter((meta) => meta.id !== id),
      })),

    removeSkill: (skillId) =>
      set((state) => ({
        selectedSkills: state.selectedSkills.filter((item) => item.skillId !== skillId),
      })),

    removeTool: (toolId) =>
      set((state) => ({
        selectedTools: state.selectedTools.filter((item) => item.toolId !== toolId),
      })),

    replaceAgentIfMissing: (fallbackAgent) =>
      set((state) =>
        fallbackAgent.agentId === state.selectedAgent.agentId
          ? {}
          : { selectedAgent: fallbackAgent, selectedSkills: [], selectedTools: [] }
      ),

    replaceExternalSkills: (selected) =>
      set((state) => {
        const selectedIds = new Set(selected.map((item) => item.skill.skillId));
        const kept = state.selectedSkills.filter(
          (item) => !item.external || selectedIds.has(item.skillId)
        );
        const existingIds = new Set(kept.map((item) => item.skillId));
        const additions = selected
          .filter(({ skill }) => !existingIds.has(skill.skillId))
          .map(({ skill, sourceAgent }) =>
            buildSkillSelection(skill, { sourceAgent, external: true })
          );
        return { selectedSkills: [...kept, ...additions] };
      }),

    setAttachmentOpen: (attachmentOpen) => set({ attachmentOpen }),
    setAvailableModels: (availableModels) => set({ availableModels }),
    setDocumentPickerOpen: (documentPickerOpen) => set({ documentPickerOpen }),
    setIsComposing: (isComposing) => set({ isComposing }),
    setIsDragOver: (isDragOver) => set({ isDragOver }),
    setModelOpen: (modelOpen) => set({ modelOpen }),
    setOtherSkillModalOpen: (otherSkillModalOpen) => set({ otherSkillModalOpen }),

    setPendingAttachmentUploadStatus: (id, status) =>
      set((state) => ({
        pendingAttachmentUploads: state.pendingAttachmentUploads.map((upload) =>
          upload.id === id ? { ...upload, status } : upload
        ),
      })),

    setPendingAttachmentUploadFailed: (id) =>
      set((state) => ({
        pendingAttachmentUploads: state.pendingAttachmentUploads.map((upload) =>
          upload.id === id ? { ...upload, status: 'failed' } : upload
        ),
      })),

    setSelectedAgent: (selectedAgent) =>
      set((state) =>
        state.selectedAgent.agentId === selectedAgent.agentId
          ? { selectedAgent }
          : { selectedAgent, selectedSkills: [], selectedTools: [] }
      ),
    setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
    setSkillMenuOpen: (skillMenuOpen) => set({ skillMenuOpen }),
    setValue: (value) => set({ value }),

    toggleSkill: (skill, sourceAgent) =>
      set((state) => {
        const exists = state.selectedSkills.some((item) => item.skillId === skill.skillId);
        return {
          selectedSkills: exists
            ? state.selectedSkills.filter((item) => item.skillId !== skill.skillId)
            : [...state.selectedSkills, buildSkillSelection(skill, { sourceAgent })],
        };
      }),

    toggleTool: (tool) =>
      set((state) => {
        const exists = state.selectedTools.some((item) => item.toolId === tool.toolId);
        return {
          selectedTools: exists
            ? state.selectedTools.filter((item) => item.toolId !== tool.toolId)
            : [...state.selectedTools, tool],
        };
      }),
  }));
}

export function selectChatInputCompletionState(
  state: ChatInputStoreState
): ChatInputCompletionState {
  return {
    value: state.value,
    selectedModelId: state.selectedModelId,
    selectedAgent: state.selectedAgent,
    selectedSkills: state.selectedSkills,
    selectedTools: state.selectedTools,
    activeDocRefs: state.activeDocRefs,
    activeAttachments: state.activeAttachments,
    pendingImageMetas: state.pendingImageMetas,
  };
}

export function selectChatInputSelectedModel(state: ChatInputStoreState): ChatModel | null {
  if (state.availableModels.length === 0) return null;
  const explicitModel = state.selectedModelId
    ? state.availableModels.find((model) => model.id === state.selectedModelId)
    : undefined;
  return (
    explicitModel ??
    state.availableModels.find((model) => model.isDefault) ??
    state.availableModels[0]
  );
}

export function useChatInputStoreApi(): ChatInputStoreApi {
  const store = useContext(ChatInputStoreContext);
  if (store == null) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'useChatInputStoreApi must be used within ChatInputStoreProvider',
    });
  }
  return store;
}

export function useChatInputStore<T>(selector: (state: ChatInputStoreState) => T): T {
  const store = useChatInputStoreApi();
  return useStore(store, selector);
}
