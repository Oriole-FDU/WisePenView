import { executeApiContract } from '@/apis/executeApiContract';

import {
  CreateSessionApiContract,
  DeleteSessionApiContract,
  GetSessionApiContract,
  InitTemporaryAttachmentUploadApiContract,
  ListHistoryMessagesApiContract,
  ListSessionsApiContract,
  RenameSessionApiContract,
  SetSessionAgentApiContract,
} from './ChatSessionApi.contract';
import type {
  ChatSessionApi as ChatSessionApiModel,
  CreateSessionApiRequest,
  DeleteSessionApiRequest,
  GetSessionApiRequest,
  InitTemporaryAttachmentUploadApiRequest,
  InitTemporaryAttachmentUploadApiResponse,
  ListHistoryMessagesApiRequest,
  ListHistoryMessagesApiResponse,
  ListSessionsApiRequest,
  ListSessionsApiResponse,
  RenameSessionApiRequest,
  SetSessionAgentApiRequest,
} from './ChatSessionApi.schema';

function initTemporaryAttachmentUpload(
  request: InitTemporaryAttachmentUploadApiRequest
): Promise<InitTemporaryAttachmentUploadApiResponse> {
  return executeApiContract(InitTemporaryAttachmentUploadApiContract, request);
}

function createSession(request: CreateSessionApiRequest): Promise<ChatSessionApiModel> {
  return executeApiContract(CreateSessionApiContract, request);
}

function getSession(request: GetSessionApiRequest): Promise<ChatSessionApiModel> {
  return executeApiContract(GetSessionApiContract, request);
}

function setSessionAgent(request: SetSessionAgentApiRequest): Promise<ChatSessionApiModel> {
  return executeApiContract(SetSessionAgentApiContract, request);
}

function renameSession(request: RenameSessionApiRequest): Promise<ChatSessionApiModel> {
  return executeApiContract(RenameSessionApiContract, request);
}

async function deleteSession(request: DeleteSessionApiRequest): Promise<void> {
  await executeApiContract(DeleteSessionApiContract, request);
}

function listSessions(request: ListSessionsApiRequest): Promise<ListSessionsApiResponse> {
  return executeApiContract(ListSessionsApiContract, request);
}

function listHistoryMessages(
  request: ListHistoryMessagesApiRequest
): Promise<ListHistoryMessagesApiResponse> {
  return executeApiContract(ListHistoryMessagesApiContract, request);
}

export const ChatSessionApi = {
  initTemporaryAttachmentUpload,
  createSession,
  getSession,
  setSessionAgent,
  renameSession,
  deleteSession,
  listSessions,
  listHistoryMessages,
};
