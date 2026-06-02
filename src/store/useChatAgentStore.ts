import { create } from 'zustand';

export type ChatAgentType = 'PERSONAL' | 'GROUP';

export interface ChatAgentOption {
  agentId: string;
  agentType: ChatAgentType;
  label: string;
  groupId?: string;
  groupName?: string;
  isDefault?: boolean;
}

interface ChatAgentState {
  draftAgent: ChatAgentOption | null;
  sessionAgentBySessionId: Record<string, ChatAgentOption>;
  setDraftAgent: (agent: ChatAgentOption | null) => void;
  setSessionAgent: (sessionId: string, agent: ChatAgentOption) => void;
  clearSessionAgent: (sessionId: string) => void;
}

const DEFAULT_STATE = {
  draftAgent: null,
  sessionAgentBySessionId: {},
};

export const useChatAgentStore = create<ChatAgentState>()((set) => ({
  ...DEFAULT_STATE,

  setDraftAgent: (agent) => set({ draftAgent: agent }),

  setSessionAgent: (sessionId, agent) =>
    set((state) => ({
      sessionAgentBySessionId: {
        ...state.sessionAgentBySessionId,
        [sessionId]: agent,
      },
    })),

  clearSessionAgent: (sessionId) =>
    set((state) => {
      if (!(sessionId in state.sessionAgentBySessionId)) {
        return state;
      }
      const nextSessionAgentBySessionId = { ...state.sessionAgentBySessionId };
      delete nextSessionAgentBySessionId[sessionId];
      return {
        sessionAgentBySessionId: nextSessionAgentBySessionId,
      };
    }),
}));

export const clearChatAgentStore = (): void => {
  useChatAgentStore.setState(DEFAULT_STATE);
};
