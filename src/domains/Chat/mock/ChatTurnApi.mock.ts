import type { ChatTurnApi as ChatTurnApiContract } from '../apis/ChatTurnApi';

export const ChatTurnApi: typeof ChatTurnApiContract = {
  getActiveTurn: async () => ({ turn_id: null }),
  cancelTurn: async () => undefined,
};
