import { executeApiContract } from '@/apis/executeApiContract';

import {
  CancelChatTurnApiContract,
  CreateSessionApiContract,
  DeleteSessionApiContract,
  GetActiveChatTurnApiContract,
  InitTemporaryAttachmentUploadApiContract,
  ListHistoryMessagesApiContract,
  ListSessionsApiContract,
  RenameSessionApiContract,
  SetSessionAgentApiContract,
} from './ChatSessionApi.contract';
import type {
  ActiveChatTurnApiRequest,
  ActiveChatTurnApiResponse,
  CancelChatTurnApiRequest,
  ChatSessionApi as ChatSessionApiModel,
  CreateSessionApiRequest,
  DeleteSessionApiRequest,
  InitTemporaryAttachmentUploadApiRequest,
  InitTemporaryAttachmentUploadApiResponse,
  ListHistoryMessagesApiRequest,
  ListHistoryMessagesApiResponse,
  ListSessionsApiRequest,
  ListSessionsApiResponse,
  RenameSessionApiRequest,
  SetSessionAgentApiRequest,
} from './ChatSessionApi.schema';
/** Chat API: /chat/* */

function initTemporaryAttachmentUpload(
  req: InitTemporaryAttachmentUploadApiRequest
): Promise<InitTemporaryAttachmentUploadApiResponse> {
  return executeApiContract(InitTemporaryAttachmentUploadApiContract, req);
}

export const ChatApi = {
  initTemporaryAttachmentUpload,
};

/** Chat Completion API: /chat/completions/* */

function getActiveTurn(req: ActiveChatTurnApiRequest): Promise<ActiveChatTurnApiResponse> {
  return executeApiContract(GetActiveChatTurnApiContract, req);
}

async function cancelTurn(req: CancelChatTurnApiRequest): Promise<void> {
  await executeApiContract(CancelChatTurnApiContract, req);
}

export const ChatCompletionApi = {
  cancelTurn,
  getActiveTurn,
};

/** Chat Session API: /chat/session/* */

function createSession(req: CreateSessionApiRequest): Promise<ChatSessionApiModel> {
  return executeApiContract(CreateSessionApiContract, req);
}

function setSessionAgent(req: SetSessionAgentApiRequest): Promise<ChatSessionApiModel> {
  return executeApiContract(SetSessionAgentApiContract, req);
}

function renameSession(req: RenameSessionApiRequest): Promise<ChatSessionApiModel> {
  return executeApiContract(RenameSessionApiContract, req);
}

async function deleteSession(req: DeleteSessionApiRequest): Promise<void> {
  await executeApiContract(DeleteSessionApiContract, req);
}

function listSessions(req: ListSessionsApiRequest): Promise<ListSessionsApiResponse> {
  return executeApiContract(ListSessionsApiContract, req);
}

function listHistoryMessages(
  req: ListHistoryMessagesApiRequest
): Promise<ListHistoryMessagesApiResponse> {
  return executeApiContract(ListHistoryMessagesApiContract, req);
}

export const ChatSessionApi = {
  createSession,
  setSessionAgent,
  renameSession,
  deleteSession,
  listSessions,
  listHistoryMessages,
};
