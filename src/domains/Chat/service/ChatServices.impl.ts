import { ChatApi, ChatSessionApi } from '../apis/ChatApi';
import { useCurrentChatSessionStore, useNewChatSessionStore, useNoteSelectionStore } from '@/store';
import type {
  ChatSession,
  CreateSessionRequest,
  DeleteSessionRequest,
  IChatService,
  ListSessionsRequest,
  ListHistoryMessagesRequest,
  MessageResponse,
  ModelListResponse,
  PageResult,
  RenameSessionRequest,
} from './index.type';

const getModels = async (): Promise<ModelListResponse> => {
  const data = await ChatApi.listModels();

  return {
    standard_models: data?.standard_models ?? [],
    advanced_models: data?.advanced_models ?? [],
    other_models: data?.other_models ?? [],
  };
};

const createSession = async (params?: CreateSessionRequest): Promise<ChatSession> => {
  const payload: { title?: string } = {};
  if (params?.title !== undefined) {
    payload.title = params.title;
  }

  const data = await ChatSessionApi.createSession(payload);
  if (!data) {
    throw new Error('创建会话失败');
  }
  return data;
};

const renameSession = async (params: RenameSessionRequest): Promise<ChatSession> => {
  const payload: { new_title?: string } = {};
  if (params.newTitle !== undefined) {
    payload.new_title = params.newTitle;
  }

  const data = await ChatSessionApi.renameSession({
    sessionId: params.sessionId,
    newTitle: payload.new_title,
  });
  if (!data) {
    throw new Error('重命名会话失败');
  }
  return data;
};

const deleteSession = async (params: DeleteSessionRequest): Promise<void> => {
  await ChatSessionApi.deleteSession({ sessionId: params.sessionId });
  useCurrentChatSessionStore.getState().clearCurrentSessionById(params.sessionId);
  useNewChatSessionStore.getState().clearNewChatSessionById(params.sessionId);
  useNoteSelectionStore.getState().clearSelectedText(params.sessionId);
};

const listSessions = async (params?: ListSessionsRequest): Promise<PageResult<ChatSession>> => {
  const payload = await ChatSessionApi.listSessions({
    page: params?.page,
    size: params?.size,
  });
  return {
    list: payload?.list ?? [],
    total: payload?.total ?? 0,
    page: payload?.page ?? params?.page ?? 1,
    size: payload?.size ?? params?.size ?? 20,
    total_page: payload?.total_page ?? 0,
  };
};

const listHistoryMessages = async (
  params: ListHistoryMessagesRequest
): Promise<PageResult<MessageResponse>> => {
  const payload = await ChatSessionApi.listHistoryMessages({
    sessionId: params.sessionId,
    page: params.page,
    size: params.size,
  });
  return {
    list: payload?.list ?? [],
    total: payload?.total ?? 0,
    page: payload?.page ?? params.page ?? 1,
    size: payload?.size ?? params.size ?? 20,
    total_page: payload?.total_page ?? 0,
  };
};

export const createChatServices = (): IChatService => ({
  getModels,
  createSession,
  renameSession,
  deleteSession,
  listSessions,
  listHistoryMessages,
});
