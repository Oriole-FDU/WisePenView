import { executeApiContract } from '@/apis/executeApiContract';

import {
  ListUserMessagesApiContract,
  type ListUserMessagesApiContractRequest,
  type ListUserMessagesApiContractResponse,
  ReadMessageApiContract,
  type ReadMessageApiContractRequest,
} from './MessageApi.contract';

function listUserMessages(
  req: ListUserMessagesApiContractRequest
): Promise<ListUserMessagesApiContractResponse> {
  return executeApiContract(ListUserMessagesApiContract, req);
}

async function readMessage(req: ReadMessageApiContractRequest): Promise<void> {
  await executeApiContract(ReadMessageApiContract, req);
}

export const MessageApi = {
  listUserMessages,
  readMessage,
};
