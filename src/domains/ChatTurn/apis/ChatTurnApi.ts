import { executeApiContract } from '@/apis/executeApiContract';

import type { ChatRecoverApiRequest } from './ChatStreamApi.schema';
import {
  CancelChatTurnApiContract,
  GetActiveChatTurnApiContract,
  RespondChatTurnApiContract,
} from './ChatTurnApi.contract';
import type {
  ActiveChatTurnApiRequest,
  ActiveChatTurnApiResponse,
  CancelChatTurnApiRequest,
} from './ChatTurnApi.schema';

function getActiveTurn(request: ActiveChatTurnApiRequest): Promise<ActiveChatTurnApiResponse> {
  return executeApiContract(GetActiveChatTurnApiContract, request);
}

async function cancelTurn(request: CancelChatTurnApiRequest): Promise<void> {
  await executeApiContract(CancelChatTurnApiContract, request);
}

async function respondChatTurn(request: ChatRecoverApiRequest): Promise<void> {
  await executeApiContract(RespondChatTurnApiContract, request);
}

export const ChatTurnApi = { cancelTurn, getActiveTurn, respondChatTurn };
