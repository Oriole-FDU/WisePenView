import { executeApiContract } from '@/apis/executeApiContract';

import { CancelChatTurnApiContract, GetActiveChatTurnApiContract } from './ChatTurnApi.contract';
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

export const ChatTurnApi = { cancelTurn, getActiveTurn };
