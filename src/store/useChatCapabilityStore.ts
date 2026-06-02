import type { SkillSummary } from '@/domains';
import { create } from 'zustand';
import type { ChatAgentOption } from './useChatAgentStore';

export interface TemporarySkillSelection {
  skillId: string;
  displayName: string;
  currentVersionId?: string;
  scopeType?: 'PERSONAL' | 'GROUP';
  groupId?: string;
  groupName?: string;
  sourceAgentId?: string;
  sourceAgentLabel?: string;
  external?: boolean;
}

export interface TemporaryToolSelection {
  toolId: string;
  label: string;
}

interface ChatCapabilityState {
  selectedSkills: TemporarySkillSelection[];
  selectedTools: TemporaryToolSelection[];
  toggleSkill: (skill: SkillSummary, options?: { sourceAgent?: ChatAgentOption | null }) => void;
  removeSkill: (skillId: string) => void;
  toggleTool: (tool: TemporaryToolSelection) => void;
  clearCapabilities: () => void;
}

const INITIAL_STATE = {
  selectedSkills: [],
  selectedTools: [],
};

export const useChatCapabilityStore = create<ChatCapabilityState>()((set) => ({
  ...INITIAL_STATE,

  toggleSkill: (skill, options) =>
    set((state) => {
      const exists = state.selectedSkills.some((item) => item.skillId === skill.skillId);
      if (exists) {
        return {
          selectedSkills: state.selectedSkills.filter((item) => item.skillId !== skill.skillId),
        };
      }

      const sourceAgent = options?.sourceAgent;
      return {
        selectedSkills: [
          ...state.selectedSkills,
          {
            skillId: skill.skillId,
            displayName: skill.displayName,
            currentVersionId: skill.currentVersionId,
            scopeType: skill.scopeType,
            groupId: skill.groupId,
            groupName: skill.groupName,
            sourceAgentId: sourceAgent?.agentId,
            sourceAgentLabel: sourceAgent?.label,
            external:
              Boolean(sourceAgent) &&
              (sourceAgent?.agentType === 'GROUP'
                ? sourceAgent.groupId !== skill.groupId
                : skill.scopeType === 'GROUP'),
          },
        ],
      };
    }),

  removeSkill: (skillId) =>
    set((state) => ({
      selectedSkills: state.selectedSkills.filter((item) => item.skillId !== skillId),
    })),

  toggleTool: (tool) =>
    set((state) => {
      const exists = state.selectedTools.some((item) => item.toolId === tool.toolId);
      return exists
        ? {
            selectedTools: state.selectedTools.filter((item) => item.toolId !== tool.toolId),
          }
        : {
            selectedTools: [...state.selectedTools, tool],
          };
    }),

  clearCapabilities: () => set(INITIAL_STATE),
}));

export const clearChatCapabilityStore = (): void => {
  useChatCapabilityStore.setState(INITIAL_STATE);
};
