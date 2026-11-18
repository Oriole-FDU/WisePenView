import { ChatTurnApi } from '@domain-apis';

import type { ChatCompletionApiRequest, ChatRecoverApiRequest } from '../apis/ChatTurnApi.schema';
import type { IChatTurnService } from './index.type';

const streamChatCompletion = (
  request: ChatCompletionApiRequest,
  signal?: AbortSignal
): Promise<Response> => ChatTurnApi.streamChatCompletion(request, signal);

const recoverChatStream = (
  request: ChatRecoverApiRequest,
  signal?: AbortSignal
): Promise<Response> => ChatTurnApi.streamChatRecovery(request, signal);

const reconnectChatStream = (sessionId: string, signal?: AbortSignal): Promise<Response> =>
  ChatTurnApi.reconnectChatStream({ session_id: sessionId }, signal);

const getActiveTurnId = async (sessionId: string): Promise<string | null> =>
  (await ChatTurnApi.getActiveTurn({ session_id: sessionId })).turn_id;

const cancelTurn = async (sessionId: string): Promise<void> => {
  await ChatTurnApi.cancelTurn({ session_id: sessionId });
};

export const createChatTurnServices = (): IChatTurnService => ({
  streamChatCompletion,
  recoverChatStream,
  reconnectChatStream,
  getActiveTurnId,
  cancelTurn,
});
