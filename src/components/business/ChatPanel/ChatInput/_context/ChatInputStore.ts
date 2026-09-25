import { persist } from 'zustand/middleware';
import { createStore, type StoreApi } from 'zustand/vanilla';

import {
  buildDefaultPersonalAgent,
  type CapabilitySkillSelection,
  type CapabilityToolOption,
  type ChatAgentOption,
  type ChatModel,
} from '@/domains/Chat';
import type { ResourceSkillSummary } from '@/domains/Resource';
import { createStoreJSONStorage } from '@/store/persistence';

import type {
  LocalAttachmentPayload,
  LocalAttachmentUpload,
  LocalResourcePayload,
} from '../index.type';

const DEFAULT_PERSONAL_AGENT = buildDefaultPersonalAgent();
const NEW_CHAT_TOOL_SELECTION_SCOPE = '__new_chat__';

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
}

interface ChatInputState {
  // 真正切換會話時遞增，讓舊輸入的非同步工作失效；草稿升級保留同一版本。
  sessionVersion: number;
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
  selectedAgent: ChatAgentOption;
  selectedModelId: string | null;
  selectedSkills: CapabilitySkillSelection[];
  selectedTools: CapabilityToolOption[];
  skillMenuOpen: boolean;
  toolSelectionScope: string;
  toolSelectionsByScope: Record<string, CapabilityToolOption[]>;
  value: string;
}

interface ChatInputActions {
  addActiveAttachment: (attachment: LocalAttachmentPayload) => void;
  addDocRefs: (resources: LocalResourcePayload[]) => void;
  addPendingAttachmentUpload: (upload: LocalAttachmentUpload) => void;
  clearAfterSend: () => void;
  clearCapabilities: () => void;
  removeActiveAttachment: (attachmentId: string) => void;
  removeDocRef: (resourceId: string) => void;
  removePendingAttachmentUpload: (id: string) => void;
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
  setPendingAttachmentUploadFailed: (id: string) => void;
  setSelectedAgent: (agent: ChatAgentOption) => void;
  setSelectedModelId: (modelId: string | null) => void;
  setSkillMenuOpen: (open: boolean) => void;
  setToolSelectionSession: (sessionId: string | undefined, promoteDraft: boolean) => void;
  setValue: (value: string) => void;
  toggleSkill: (skill: ResourceSkillSummary, sourceAgent: ChatAgentOption) => void;
  toggleTool: (tool: CapabilityToolOption) => void;
}

export type ChatInputStoreState = ChatInputState & ChatInputActions;
export type ChatInputStoreApi = StoreApi<ChatInputStoreState>;

interface ChatInputPersistedState {
  selectedAgent: ChatAgentOption;
  selectedModelId: string | null;
  selectedSkills: CapabilitySkillSelection[];
  selectedTools: CapabilityToolOption[];
  toolSelectionScope: string;
  toolSelectionsByScope: Record<string, CapabilityToolOption[]>;
}

const INITIAL_STATE: ChatInputState = {
  sessionVersion: 0,
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
  selectedAgent: DEFAULT_PERSONAL_AGENT,
  selectedModelId: null,
  selectedSkills: [],
  selectedTools: [],
  skillMenuOpen: false,
  toolSelectionScope: NEW_CHAT_TOOL_SELECTION_SCOPE,
  toolSelectionsByScope: {},
  value: '',
};

function isSameAgentSelection(left: ChatAgentOption, right: ChatAgentOption): boolean {
  return (
    left.agentId === right.agentId && (left.agentVersion ?? null) === (right.agentVersion ?? null)
  );
}

function selectChatInputPersistedState(state: ChatInputStoreState): ChatInputPersistedState {
  return {
    selectedAgent: state.selectedAgent,
    selectedModelId: state.selectedModelId,
    selectedSkills: state.selectedSkills,
    selectedTools: state.selectedTools,
    toolSelectionScope: state.toolSelectionScope,
    toolSelectionsByScope: state.toolSelectionsByScope,
  };
}

export function createChatInputStore(): ChatInputStoreApi {
  return createStore<ChatInputStoreState>()(
    persist(
      (set) => ({
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

        clearAfterSend: () =>
          set({
            activeDocRefs: [],
            activeAttachments: [],
            pendingAttachmentUploads: [],
            value: '',
          }),

        clearCapabilities: () =>
          set((state) => ({
            selectedSkills: [],
            selectedTools: [],
            toolSelectionsByScope: {
              ...state.toolSelectionsByScope,
              [state.toolSelectionScope]: [],
            },
          })),

        removeActiveAttachment: (attachmentId) =>
          set((state) => ({
            activeAttachments: state.activeAttachments.filter(
              (attachment) => attachment.attachmentId !== attachmentId
            ),
          })),

        removeDocRef: (resourceId) =>
          set((state) => ({
            activeDocRefs: state.activeDocRefs.filter(
              (resource) => resource.resourceId !== resourceId
            ),
          })),

        removePendingAttachmentUpload: (id) =>
          set((state) => ({
            pendingAttachmentUploads: state.pendingAttachmentUploads.filter(
              (upload) => upload.id !== id
            ),
          })),

        removeSkill: (skillId) =>
          set((state) => ({
            selectedSkills: state.selectedSkills.filter((item) => item.skillId !== skillId),
          })),

        removeTool: (toolId) =>
          set((state) => {
            const selectedTools = state.selectedTools.filter((item) => item.toolId !== toolId);
            return {
              selectedTools,
              toolSelectionsByScope: {
                ...state.toolSelectionsByScope,
                [state.toolSelectionScope]: selectedTools,
              },
            };
          }),

        replaceAgentIfMissing: (fallbackAgent) =>
          set((state) =>
            isSameAgentSelection(state.selectedAgent, fallbackAgent)
              ? {}
              : { selectedAgent: fallbackAgent, selectedSkills: [] }
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

        setPendingAttachmentUploadFailed: (id) =>
          set((state) => ({
            pendingAttachmentUploads: state.pendingAttachmentUploads.map((upload) =>
              upload.id === id ? { ...upload, status: 'failed' } : upload
            ),
          })),

        setSelectedAgent: (selectedAgent) =>
          set((state) =>
            isSameAgentSelection(state.selectedAgent, selectedAgent)
              ? { selectedAgent }
              : { selectedAgent, selectedSkills: [] }
          ),
        setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
        setSkillMenuOpen: (skillMenuOpen) => set({ skillMenuOpen }),
        setToolSelectionSession: (sessionId, promoteDraft) =>
          set((state) => {
            const nextScope = sessionId ?? NEW_CHAT_TOOL_SELECTION_SCOPE;
            if (nextScope === state.toolSelectionScope) return {};

            const shouldPromoteDraft =
              promoteDraft &&
              sessionId !== undefined &&
              state.toolSelectionScope === NEW_CHAT_TOOL_SELECTION_SCOPE;
            const selectedTools = shouldPromoteDraft
              ? state.selectedTools
              : (state.toolSelectionsByScope[nextScope] ?? []);
            const toolSelectionsByScope = {
              ...state.toolSelectionsByScope,
              [nextScope]: selectedTools,
            };
            if (state.toolSelectionScope === NEW_CHAT_TOOL_SELECTION_SCOPE) {
              delete toolSelectionsByScope[NEW_CHAT_TOOL_SELECTION_SCOPE];
            }

            return {
              // 草稿升級為正式會話時保留附件；真正切換會話時丟棄舊輸入與晚到的上傳。
              ...(!shouldPromoteDraft && {
                sessionVersion: state.sessionVersion + 1,
                value: '',
                activeDocRefs: [],
                activeAttachments: [],
                pendingAttachmentUploads: [],
              }),
              selectedTools,
              toolSelectionScope: nextScope,
              toolSelectionsByScope,
            };
          }),
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
            const selectedTools = exists
              ? state.selectedTools.filter((item) => item.toolId !== tool.toolId)
              : [...state.selectedTools, tool];
            return {
              selectedTools,
              toolSelectionsByScope: {
                ...state.toolSelectionsByScope,
                [state.toolSelectionScope]: selectedTools,
              },
            };
          }),
      }),
      {
        name: 'chat-input',
        storage: createStoreJSONStorage('tab'),
        partialize: selectChatInputPersistedState,
      }
    )
  );
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
