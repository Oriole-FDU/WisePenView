import {
  ChatTurnApi,
  reconnectChatStream as reconnectChatStreamApi,
  streamChatCompletion as streamChatCompletionApi,
  streamChatRecovery as streamChatRecoveryApi,
} from '@domain-apis';

import type { IChatService } from './index.type';

const getActiveTurnId = async (sessionId: string): Promise<string | null> =>
  (await ChatTurnApi.getActiveTurn({ session_id: sessionId })).turn_id;

const cancelTurn = async (sessionId: string): Promise<void> => {
  await ChatTurnApi.cancelTurn({ session_id: sessionId });
};

export const createChatServices = (): IChatService => ({
  streamChatCompletion: (request, signal) => streamChatCompletionApi(request, signal),
  recoverChatStream: (request, signal) => streamChatRecoveryApi(request, signal),
  reconnectChatStream: (sessionId, signal) =>
    reconnectChatStreamApi({ session_id: sessionId }, signal),
  getActiveTurnId,
  cancelTurn,
});
