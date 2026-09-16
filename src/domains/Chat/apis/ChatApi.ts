import { apiGet, apiPost } from '@/apis/request';

import type {
  ActiveChatTurnApiRequest,
  ActiveChatTurnApiResponse,
  BindModelProviderApiRequest,
  BindModelProviderApiResponse,
  CancelChatTurnApiRequest,
  CancelChatTurnApiResponse,
  CreateSessionApiRequest,
  CreateSessionApiResponse,
  CreateUserModelApiRequest,
  CreateUserModelApiResponse,
  CreateUserProviderApiRequest,
  DeleteSessionApiRequest,
  DeleteSessionApiResponse,
  DeleteUserModelApiRequest,
  DeleteUserModelApiResponse,
  DeleteUserProviderApiRequest,
  DeleteUserProviderApiResponse,
  DeleteUserToolConfigApiRequest,
  DeleteUserToolConfigApiResponse,
  InitTemporaryAttachmentUploadApiRequest,
  InitTemporaryAttachmentUploadApiResponse,
  ListAvailableModelsApiResponse,
  ListHistoryMessagesApiRequest,
  ListHistoryMessagesApiResponse,
  ListModelsApiRequest,
  ListModelsApiResponse,
  ListSessionsApiRequest,
  ListSessionsApiResponse,
  ListToolsApiResponse,
  ListUserProvidersApiResponse,
  RenameSessionApiRequest,
  RenameSessionApiResponse,
  SetSessionAgentApiRequest,
  SetSessionAgentApiResponse,
  UnbindModelProviderApiRequest,
  UnbindModelProviderApiResponse,
  UpdateUserModelApiRequest,
  UpdateUserModelApiResponse,
  UpdateUserProviderApiRequest,
  UpdateUserProviderApiResponse,
  UpdateUserToolConfigApiRequest,
  UpdateUserToolConfigApiResponse,
} from './ChatApi.type';

/** Chat API: /chat/* */

function listAvailableModels(): Promise<ListAvailableModelsApiResponse> {
  return apiGet('/chat/model/listAvailableModels');
}

function listModels(req: ListModelsApiRequest): Promise<ListModelsApiResponse> {
  return apiGet('/chat/model/listModels', { params: req });
}

function listTools(): Promise<ListToolsApiResponse> {
  return apiGet('/chat/tool/listUserTools');
}

function initTemporaryAttachmentUpload(
  req: InitTemporaryAttachmentUploadApiRequest
): Promise<InitTemporaryAttachmentUploadApiResponse> {
  return apiPost('/chat/attachment/initUploadTemporaryAttachment', req);
}

function listUserProviders(): Promise<ListUserProvidersApiResponse> {
  return apiGet('/chat/model/listUserProviders');
}

function createUserProvider(req: CreateUserProviderApiRequest): Promise<null> {
  return apiPost('/chat/model/createUserProvider', req);
}

function updateUserProvider(
  req: UpdateUserProviderApiRequest
): Promise<UpdateUserProviderApiResponse> {
  return apiPost('/chat/model/updateUserProvider', req);
}

function deleteUserProvider(
  req: DeleteUserProviderApiRequest
): Promise<DeleteUserProviderApiResponse> {
  return apiPost('/chat/model/deleteUserProvider', req);
}

function createUserModel(req: CreateUserModelApiRequest): Promise<CreateUserModelApiResponse> {
  return apiPost('/chat/model/createUserModel', req);
}

function updateUserModel(req: UpdateUserModelApiRequest): Promise<UpdateUserModelApiResponse> {
  return apiPost('/chat/model/updateUserModel', req);
}

function deleteUserModel(req: DeleteUserModelApiRequest): Promise<DeleteUserModelApiResponse> {
  return apiPost('/chat/model/deleteUserModel', req);
}

function bindModelProvider(
  req: BindModelProviderApiRequest
): Promise<BindModelProviderApiResponse> {
  return apiPost('/chat/model/bindModelProvider', req);
}

function unbindModelProvider(
  req: UnbindModelProviderApiRequest
): Promise<UnbindModelProviderApiResponse> {
  return apiPost('/chat/model/unbindModelProvider', req);
}

function updateUserToolConfig(
  req: UpdateUserToolConfigApiRequest
): Promise<UpdateUserToolConfigApiResponse> {
  return apiPost('/chat/tool/updateUserToolConfig', req);
}

function deleteUserToolConfig(
  req: DeleteUserToolConfigApiRequest
): Promise<DeleteUserToolConfigApiResponse> {
  return apiPost('/chat/tool/deleteUserToolConfig', req);
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
  return apiGet('/chat/completions/active', { params: req });
}

function cancelTurn(req: CancelChatTurnApiRequest): Promise<CancelChatTurnApiResponse> {
  return apiPost('/chat/completions/cancel', req);
}

export const ChatCompletionApi = {
  cancelTurn,
  getActiveTurn,
};

/** Chat Session API: /chat/session/* */

function createSession(req: CreateSessionApiRequest): Promise<CreateSessionApiResponse> {
  return apiPost('/chat/session/createSession', req);
}

function setSessionAgent(req: SetSessionAgentApiRequest): Promise<SetSessionAgentApiResponse> {
  return apiPost(
    '/chat/session/setSessionAgent',
    {
      agent_id: req.agent_id,
      agent_version: req.agent_version,
    },
    {
      params: { session_id: req.session_id },
    }
  );
}

function renameSession(req: RenameSessionApiRequest): Promise<RenameSessionApiResponse> {
  return apiPost(
    '/chat/session/renameSession',
    { new_title: req.new_title },
    {
      params: { session_id: req.session_id },
    }
  );
}

function deleteSession(req: DeleteSessionApiRequest): Promise<DeleteSessionApiResponse> {
  return apiPost('/chat/session/deleteSession', undefined, {
    params: { session_id: req.session_id },
  });
}

function listSessions(req: ListSessionsApiRequest): Promise<ListSessionsApiResponse> {
  return apiGet('/chat/session/listSessions', { params: req });
}

function listHistoryMessages(
  req: ListHistoryMessagesApiRequest
): Promise<ListHistoryMessagesApiResponse> {
  return apiGet('/chat/session/listHistoryMessages', {
    params: req,
  });
}

export const ChatSessionApi = {
  createSession,
  setSessionAgent,
  renameSession,
  deleteSession,
  listSessions,
  listHistoryMessages,
};
