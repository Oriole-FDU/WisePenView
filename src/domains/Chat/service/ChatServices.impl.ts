import {
  ChatApi,
  ChatCompletionApi,
  ChatSessionApi,
  putOssPresignedUrl,
  reconnectChatStream as reconnectChatStreamApi,
  streamChatCompletion as streamChatCompletionApi,
  streamChatRecovery as streamChatRecoveryApi,
} from '@domain-apis';

import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { computeFileMd5 } from '@/utils/file/computeFileMd5';
import { parseExtension } from '@/utils/file/parseExtension';

import type { WisePenUIMessage } from '../entity/message';
import { ChatServicesMap } from '../mapper/ChatServices.map';
import {
  cacheSessions,
  getSessionCacheSnapshot,
  removeCachedSession,
} from '../session/sessionCache';
import type {
  ChatSession,
  CreateSessionRequest,
  DeleteSessionRequest,
  IChatService,
  ListHistoryMessagesRequest,
  ListSessionsRequest,
  PageResult,
  RenameSessionRequest,
  SetSessionAgentRequest,
  UploadAttachmentParams,
  UploadAttachmentResult,
} from './index.type';

const getActiveTurnId = async (sessionId: string): Promise<string | null> =>
  ChatServicesMap.mapActiveTurnIdFromApi(
    await ChatCompletionApi.getActiveTurn({ session_id: sessionId })
  );

const cancelTurn = async (sessionId: string): Promise<void> => {
  await ChatCompletionApi.cancelTurn({ session_id: sessionId });
};

const createSession = async (params?: CreateSessionRequest): Promise<ChatSession> => {
  const snapshot = getSessionCacheSnapshot();
  const data = await ChatSessionApi.createSession(ChatServicesMap.mapCreateSessionRequest(params));
  if (!data) {
    throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_CREATE_SESSION_FAILED);
  }
  const session = ChatServicesMap.mapCreateSessionFromApi(data);
  cacheSessions([session], snapshot);
  return session;
};

const setSessionAgent = async (params: SetSessionAgentRequest): Promise<ChatSession> => {
  const snapshot = getSessionCacheSnapshot();
  const data = await ChatSessionApi.setSessionAgent(
    ChatServicesMap.mapSetSessionAgentRequest(params)
  );
  if (!data) {
    throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_CREATE_SESSION_FAILED);
  }
  const session = ChatServicesMap.mapSetSessionAgentFromApi(data);
  cacheSessions([session], snapshot);
  return session;
};

const renameSession = async (params: RenameSessionRequest): Promise<ChatSession> => {
  const snapshot = getSessionCacheSnapshot();
  const data = await ChatSessionApi.renameSession(ChatServicesMap.mapRenameSessionRequest(params));
  if (!data) {
    throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_RENAME_SESSION_FAILED);
  }
  const session = ChatServicesMap.mapRenameSessionFromApi(data);
  cacheSessions([session], snapshot);
  return session;
};

const deleteSession = async (params: DeleteSessionRequest): Promise<void> => {
  const snapshot = getSessionCacheSnapshot();
  await ChatSessionApi.deleteSession({ session_id: params.sessionId });
  removeCachedSession(params.sessionId, snapshot);
};

const listSessions = async (params?: ListSessionsRequest): Promise<PageResult<ChatSession>> => {
  const snapshot = getSessionCacheSnapshot();
  const page = ChatServicesMap.mapListSessionsFromApi(
    await ChatSessionApi.listSessions(ChatServicesMap.mapListSessionsRequest(params))
  );
  cacheSessions(page.list, snapshot, true);
  return page;
};

const listHistoryMessages = async (
  params: ListHistoryMessagesRequest
): Promise<PageResult<WisePenUIMessage>> =>
  ChatServicesMap.mapListHistoryMessagesFromApi(
    await ChatSessionApi.listHistoryMessages(ChatServicesMap.mapListHistoryMessagesRequest(params))
  );

const uploadAttachment = async ({
  sessionId,
  file,
  saveToLibrary,
}: UploadAttachmentParams): Promise<UploadAttachmentResult> => {
  const md5 = await computeFileMd5(file);
  const response = await ChatApi.initTemporaryAttachmentUpload({
    session_id: sessionId,
    filename: file.name,
    extension: parseExtension(file.name),
    file_size: file.size,
    md5,
    enable_library: Boolean(saveToLibrary),
  });
  if (!response?.attachment_id) {
    throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_ATTACHMENT_UPLOAD_INIT_FAILED);
  }
  if (response.flash_uploaded) {
    return { attachmentId: response.attachment_id, filename: file.name };
  }
  if (!response.put_url) {
    throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_ATTACHMENT_UPLOAD_INIT_FAILED);
  }
  await putOssPresignedUrl({
    putUrl: response.put_url,
    body: file,
    callbackHeader: response.callback_header ?? '',
  });
  return { attachmentId: response.attachment_id, filename: file.name };
};

export const createChatServices = (): IChatService => ({
  streamChatCompletion: (request, signal) => streamChatCompletionApi(request, signal),
  recoverChatStream: (request, signal) => streamChatRecoveryApi(request, signal),
  reconnectChatStream: (sessionId, signal) =>
    reconnectChatStreamApi({ session_id: sessionId }, signal),
  getActiveTurnId,
  cancelTurn,
  createSession,
  setSessionAgent,
  renameSession,
  deleteSession,
  listSessions,
  listHistoryMessages,
  uploadAttachment,
});
