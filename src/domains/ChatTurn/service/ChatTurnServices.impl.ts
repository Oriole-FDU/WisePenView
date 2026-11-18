import { ChatTurnApi } from '@domain-apis';

import type { IChatTurnService } from './index.type';

const getActiveTurnId = async (sessionId: string): Promise<string | null> =>
  (await ChatTurnApi.getActiveTurn({ session_id: sessionId })).turn_id;

const cancelTurn = async (sessionId: string): Promise<void> => {
  await ChatTurnApi.cancelTurn({ session_id: sessionId });
};

export const createChatTurnServices = (): IChatTurnService => ({
  streamChatCompletion: (request, signal) => ChatTurnApi.streamChatCompletion(request, signal),
  recoverChatStream: (request, signal) => ChatTurnApi.streamChatRecovery(request, signal),
  reconnectChatStream: (sessionId, signal) =>
    ChatTurnApi.reconnectChatStream({ session_id: sessionId }, signal),
  getActiveTurnId,
  cancelTurn,
});
