import { executeApiContract } from '@/apis/executeApiContract';
import { apiGetUnchecked, apiPostUnchecked } from '@/apis/request';

import type {
  BindModelProviderApiRequest,
  BindModelProviderApiResponse,
  CreateUserModelApiRequest,
  CreateUserModelApiResponse,
  CreateUserProviderApiRequest,
  DeleteUserModelApiRequest,
  DeleteUserModelApiResponse,
  DeleteUserProviderApiRequest,
  DeleteUserProviderApiResponse,
  DeleteUserToolConfigApiRequest,
  DeleteUserToolConfigApiResponse,
  ListAvailableModelsApiResponse,
  ListModelsApiRequest,
  ListModelsApiResponse,
  ListToolsApiResponse,
  ListUserProvidersApiResponse,
  UnbindModelProviderApiRequest,
  UnbindModelProviderApiResponse,
  UpdateUserModelApiRequest,
  UpdateUserModelApiResponse,
  UpdateUserProviderApiRequest,
  UpdateUserProviderApiResponse,
  UpdateUserToolConfigApiRequest,
  UpdateUserToolConfigApiResponse,
} from './ChatApi.type';
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
  return apiGetUnchecked('/chat/model/listAvailableModels');
}

function listModels(req: ListModelsApiRequest): Promise<ListModelsApiResponse> {
  return apiGetUnchecked('/chat/model/listModels', { params: req });
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
  return apiGetUnchecked('/chat/model/listUserProviders');
}

function createUserProvider(req: CreateUserProviderApiRequest): Promise<null> {
  return apiPostUnchecked('/chat/model/createUserProvider', req);
}

function updateUserProvider(
  req: UpdateUserProviderApiRequest
): Promise<UpdateUserProviderApiResponse> {
  return apiPostUnchecked('/chat/model/updateUserProvider', req);
}

function deleteUserProvider(
  req: DeleteUserProviderApiRequest
): Promise<DeleteUserProviderApiResponse> {
  return apiPostUnchecked('/chat/model/deleteUserProvider', req);
}

function createUserModel(req: CreateUserModelApiRequest): Promise<CreateUserModelApiResponse> {
  return apiPostUnchecked('/chat/model/createUserModel', req);
}

function updateUserModel(req: UpdateUserModelApiRequest): Promise<UpdateUserModelApiResponse> {
  return apiPostUnchecked('/chat/model/updateUserModel', req);
}

function deleteUserModel(req: DeleteUserModelApiRequest): Promise<DeleteUserModelApiResponse> {
  return apiPostUnchecked('/chat/model/deleteUserModel', req);
}

function bindModelProvider(
  req: BindModelProviderApiRequest
): Promise<BindModelProviderApiResponse> {
  return apiPostUnchecked('/chat/model/bindModelProvider', req);
}

function unbindModelProvider(
  req: UnbindModelProviderApiRequest
): Promise<UnbindModelProviderApiResponse> {
  return apiPostUnchecked('/chat/model/unbindModelProvider', req);
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
