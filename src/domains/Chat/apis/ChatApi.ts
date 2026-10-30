import { executeApiContract } from '@/apis/executeApiContract';
import { apiGetUnchecked, apiPostUnchecked } from '@/apis/request';

import type {
  DeleteUserToolConfigApiRequest,
  DeleteUserToolConfigApiResponse,
  ListToolsApiResponse,
  UpdateUserToolConfigApiRequest,
  UpdateUserToolConfigApiResponse,
} from './ChatApi.type';
import {
  BindModelProviderApiContract,
  CreateUserModelApiContract,
  CreateUserProviderApiContract,
  DeleteUserModelApiContract,
  DeleteUserProviderApiContract,
  ListAvailableModelsApiContract,
  ListModelsApiContract,
  ListUserProvidersApiContract,
  UnbindModelProviderApiContract,
  UpdateUserModelApiContract,
  UpdateUserProviderApiContract,
} from './ChatModelApi.contract';
import type {
  BindModelProviderApiRequest,
  CreateUserModelApiRequest,
  CreateUserProviderApiRequest,
  DeleteUserModelApiRequest,
  DeleteUserProviderApiRequest,
  ListAvailableModelsApiResponse,
  ListModelsApiRequest,
  ListModelsApiResponse,
  ListUserProvidersApiResponse,
  UnbindModelProviderApiRequest,
  UpdateUserModelApiRequest,
  UpdateUserProviderApiRequest,
} from './ChatModelApi.schema';
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

function listAvailableModels(): Promise<ListAvailableModelsApiResponse> {
  return executeApiContract(ListAvailableModelsApiContract, undefined);
}

function listModels(req: ListModelsApiRequest): Promise<ListModelsApiResponse> {
  return executeApiContract(ListModelsApiContract, req);
}

function listTools(): Promise<ListToolsApiResponse> {
  return apiGetUnchecked('/chat/tool/listUserTools');
}

function initTemporaryAttachmentUpload(
  req: InitTemporaryAttachmentUploadApiRequest
): Promise<InitTemporaryAttachmentUploadApiResponse> {
  return executeApiContract(InitTemporaryAttachmentUploadApiContract, req);
}

function listUserProviders(): Promise<ListUserProvidersApiResponse> {
  return executeApiContract(ListUserProvidersApiContract, undefined);
}

async function createUserProvider(req: CreateUserProviderApiRequest): Promise<void> {
  await executeApiContract(CreateUserProviderApiContract, req);
}

async function updateUserProvider(req: UpdateUserProviderApiRequest): Promise<void> {
  await executeApiContract(UpdateUserProviderApiContract, req);
}

async function deleteUserProvider(req: DeleteUserProviderApiRequest): Promise<void> {
  await executeApiContract(DeleteUserProviderApiContract, req);
}

async function createUserModel(req: CreateUserModelApiRequest): Promise<void> {
  await executeApiContract(CreateUserModelApiContract, req);
}

async function updateUserModel(req: UpdateUserModelApiRequest): Promise<void> {
  await executeApiContract(UpdateUserModelApiContract, req);
}

async function deleteUserModel(req: DeleteUserModelApiRequest): Promise<void> {
  await executeApiContract(DeleteUserModelApiContract, req);
}

async function bindModelProvider(req: BindModelProviderApiRequest): Promise<void> {
  await executeApiContract(BindModelProviderApiContract, req);
}

async function unbindModelProvider(req: UnbindModelProviderApiRequest): Promise<void> {
  await executeApiContract(UnbindModelProviderApiContract, req);
}

function updateUserToolConfig(
  req: UpdateUserToolConfigApiRequest
): Promise<UpdateUserToolConfigApiResponse> {
  return apiPostUnchecked('/chat/tool/updateUserToolConfig', req);
}

function deleteUserToolConfig(
  req: DeleteUserToolConfigApiRequest
): Promise<DeleteUserToolConfigApiResponse> {
  return apiPostUnchecked('/chat/tool/deleteUserToolConfig', req);
}

export const ChatApi = {
  listAvailableModels,
  listModels,
  listTools,
  initTemporaryAttachmentUpload,
  listUserProviders,
  createUserProvider,
  updateUserProvider,
  deleteUserProvider,
  createUserModel,
  updateUserModel,
  deleteUserModel,
  bindModelProvider,
  unbindModelProvider,
  updateUserToolConfig,
  deleteUserToolConfig,
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
