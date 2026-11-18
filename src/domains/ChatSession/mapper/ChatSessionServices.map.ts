import type { PageResult } from '@/domains/_shared/entity/page';

import type {
  ChatSessionApi,
  CreateSessionApiRequest,
  ListSessionsApiRequest,
  ListSessionsApiResponse,
  RenameSessionApiRequest,
  SetSessionAgentApiRequest,
} from '../apis/ChatSessionApi.schema';
import type {
  ChatSession,
  CreateSessionRequest,
  ListSessionsRequest,
  RenameSessionRequest,
  SetSessionAgentRequest,
} from '../service/index.type';

const mapCreateSessionRequest = (params?: CreateSessionRequest): CreateSessionApiRequest => {
  const title = params?.title;
  const hasTitle = title !== undefined;
  const agentId = params?.agentId;

  return {
    ...(hasTitle ? { title } : {}),
    ...(agentId !== undefined ? { agent_id: agentId } : {}),
  };
};

const mapSessionFromApi = (data: ChatSessionApi): ChatSession => ({
  id: data.id,
  userId: data.user_id,
  title: data.title,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  agentId: data.agent_id,
  agentVersion: data.agent_version,
});

const mapSetSessionAgentRequest = (params: SetSessionAgentRequest): SetSessionAgentApiRequest => ({
  session_id: params.sessionId,
  ...(params.agentId !== undefined ? { agent_id: params.agentId } : {}),
});

const mapRenameSessionRequest = (params: RenameSessionRequest): RenameSessionApiRequest => {
  const newTitle = params.newTitle;
  const hasNewTitle = newTitle !== undefined;

  return {
    session_id: params.sessionId,
    ...(hasNewTitle ? { new_title: newTitle } : {}),
  };
};

const mapListSessionsRequest = (params?: ListSessionsRequest): ListSessionsApiRequest => ({
  ...(params?.page !== undefined ? { page: params.page } : {}),
  ...(params?.size !== undefined ? { size: params.size } : {}),
});

const mapListSessionsFromApi = (data: ListSessionsApiResponse): PageResult<ChatSession> => ({
  list: data.list.map(mapSessionFromApi),
  total: data.total,
  page: data.page,
  size: data.size,
  totalPage: data.total_page,
});

export const ChatSessionServicesMap = {
  mapCreateSessionRequest,
  mapSetSessionAgentRequest,
  mapRenameSessionRequest,
  mapSessionFromApi,
  mapListSessionsRequest,
  mapListSessionsFromApi,
};
