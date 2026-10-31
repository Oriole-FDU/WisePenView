import { ChatSessionApi, putOssPresignedUrl } from '@domain-apis';

import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { computeFileMd5 } from '@/utils/file/computeFileMd5';
import { parseExtension } from '@/utils/file/parseExtension';

import { ChatSessionServicesMap } from '../mapper/ChatSessionServices.map';
import {
  cacheSessions,
  getSessionCacheSnapshot,
  removeCachedSession,
} from '../session/sessionCache';
import type {
  ChatSession,
  CreateSessionRequest,
  DeleteSessionRequest,
  IChatSessionService,
  ListHistoryMessagesRequest,
  ListSessionsRequest,
  RenameSessionRequest,
  SetSessionAgentRequest,
  UploadAttachmentParams,
  UploadAttachmentResult,
} from './index.type';

const createSession = async (params?: CreateSessionRequest): Promise<ChatSession> => {
  const snapshot = getSessionCacheSnapshot();
  const data = await ChatSessionApi.createSession(
    ChatSessionServicesMap.mapCreateSessionRequest(params)
  );
  if (!data) {
    throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_CREATE_SESSION_FAILED);
  }
  const session = ChatSessionServicesMap.mapSessionFromApi(data);
  cacheSessions([session], snapshot);
  return session;
};

const setSessionAgent = async (params: SetSessionAgentRequest): Promise<ChatSession> => {
  const snapshot = getSessionCacheSnapshot();
  const data = await ChatSessionApi.setSessionAgent(
    ChatSessionServicesMap.mapSetSessionAgentRequest(params)
  );
  if (!data) {
    throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_CREATE_SESSION_FAILED);
  }
  const session = ChatSessionServicesMap.mapSessionFromApi(data);
  cacheSessions([session], snapshot);
  return session;
};

const renameSession = async (params: RenameSessionRequest): Promise<ChatSession> => {
  const snapshot = getSessionCacheSnapshot();
  const data = await ChatSessionApi.renameSession(
    ChatSessionServicesMap.mapRenameSessionRequest(params)
  );
  if (!data) {
    throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_RENAME_SESSION_FAILED);
  }
  const session = ChatSessionServicesMap.mapSessionFromApi(data);
  cacheSessions([session], snapshot);
  return session;
};

const deleteSession = async (params: DeleteSessionRequest): Promise<void> => {
  const snapshot = getSessionCacheSnapshot();
  await ChatSessionApi.deleteSession({ session_id: params.sessionId });
  removeCachedSession(params.sessionId, snapshot);
};

const listSessions = async (params?: ListSessionsRequest) => {
  const snapshot = getSessionCacheSnapshot();
  const page = ChatSessionServicesMap.mapListSessionsFromApi(
    await ChatSessionApi.listSessions(ChatSessionServicesMap.mapListSessionsRequest(params))
  );
  cacheSessions(page.list, snapshot, true);
  return page;
};

const listHistoryMessages = async (params: ListHistoryMessagesRequest) =>
  ChatSessionServicesMap.mapListHistoryMessagesFromApi(
    await ChatSessionApi.listHistoryMessages(
      ChatSessionServicesMap.mapListHistoryMessagesRequest(params)
    )
  );

const uploadAttachment = async ({
  sessionId,
  file,
  saveToLibrary,
}: UploadAttachmentParams): Promise<UploadAttachmentResult> => {
  const response = await ChatSessionApi.initTemporaryAttachmentUpload({
    session_id: sessionId,
    filename: file.name,
    extension: parseExtension(file.name),
    file_size: file.size,
    md5: await computeFileMd5(file),
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
    callbackHeader: response.callback_header,
  });
  return { attachmentId: response.attachment_id, filename: file.name };
};

export const createChatSessionServices = (): IChatSessionService => ({
  createSession,
  setSessionAgent,
  renameSession,
  deleteSession,
  listSessions,
  listHistoryMessages,
  uploadAttachment,
});
