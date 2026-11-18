import { ChatTurnApi } from '@domain-apis';

import {
  mapListHistoryMessagesFromApi,
  mapListHistoryMessagesRequest,
} from '../mapper/chatHistory.mapper';
import { mapChatTurnRequest, mapToolApprovalRequest } from '../mapper/chatTurn.mapper';
import { normalizeChatSseResponse } from './chatSseNormalizer';
import type { IChatTurnService, SendTurnCommand, SubmitToolApprovalsCommand } from './index.type';

const streamChatCompletion = async (
  command: SendTurnCommand,
  signal?: AbortSignal
): Promise<Response> =>
  normalizeChatSseResponse(
    await ChatTurnApi.streamChatCompletion(
      mapChatTurnRequest({
        defaultSessionId: command.sessionId,
        defaultModel: command.model,
        query: command.query,
        options: command.options,
      }),
      signal
    )
  );

const recoverChatStream = async (
  command: SubmitToolApprovalsCommand,
  signal?: AbortSignal
): Promise<Response> =>
  normalizeChatSseResponse(
    await ChatTurnApi.streamChatRecovery(mapToolApprovalRequest(command), signal)
  );

const reconnectChatStream = async (sessionId: string, signal?: AbortSignal): Promise<Response> =>
  normalizeChatSseResponse(
    await ChatTurnApi.reconnectChatStream({ session_id: sessionId }, signal)
  );

const respondTurn = async (command: SubmitToolApprovalsCommand): Promise<void> => {
  await ChatTurnApi.respondTurn(mapToolApprovalRequest(command));
};

const getActiveTurnId = async (sessionId: string): Promise<string | null> =>
  (await ChatTurnApi.getActiveTurn({ session_id: sessionId })).turn_id;

const cancelTurn = async (sessionId: string): Promise<void> => {
  await ChatTurnApi.cancelTurn({ session_id: sessionId });
};

const listHistoryMessages = async (sessionId: string, page: number, size: number) =>
  mapListHistoryMessagesFromApi(
    await ChatTurnApi.listHistoryMessages(mapListHistoryMessagesRequest({ sessionId, page, size }))
  );

export const createChatTurnServices = (): IChatTurnService => ({
  streamChatCompletion,
  recoverChatStream,
  reconnectChatStream,
  respondTurn,
  getActiveTurnId,
  cancelTurn,
  listHistoryMessages,
});
