import { mockResponse } from '@/domains/_shared/mock/response';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { ChatSessionApi as ChatSessionApiContract } from '../apis/ChatSessionApi';
import type { ChatSessionApi as ChatSessionApiModel } from '../apis/ChatSessionApi.schema';

let mockSessionSerial = 3;
let mockSessions: ChatSessionApiModel[] = [
  {
    id: 'mock-session-1',
    user_id: 'mock-user',
    title: '项目需求讨论',
    created_at: '2026-04-08T09:00:00Z',
    updated_at: '2026-04-08T09:00:00Z',
    agent_id: null,
    agent_version: null,
  },
  {
    id: 'mock-session-2',
    user_id: 'mock-user',
    title: '接口联调记录',
    created_at: '2026-04-07T10:00:00Z',
    updated_at: '2026-04-07T10:00:00Z',
    agent_id: null,
    agent_version: null,
  },
  {
    id: 'mock-session-3',
    user_id: 'mock-user',
    title: '代码评审',
    created_at: '2026-04-06T11:00:00Z',
    updated_at: '2026-04-06T11:00:00Z',
    agent_id: null,
    agent_version: null,
  },
];

const requireSession = (id: string) => {
  const session = mockSessions.find((item) => item.id === id);
  if (!session) throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_CREATE_SESSION_FAILED);
  return session;
};

export const ChatSessionApi: typeof ChatSessionApiContract = {
  initTemporaryAttachmentUpload: async () => ({
    attachment_id: `mock-attachment-${crypto.randomUUID()}`,
    object_key: 'mock/attachment',
    put_url: 'https://mock-storage.example.invalid/upload',
    callback_header: 'mock-callback',
    flash_uploaded: true,
  }),
  createSession: async (params) => {
    const now = new Date().toISOString();
    const session: ChatSessionApiModel = {
      id: `mock-session-${++mockSessionSerial}`,
      user_id: 'mock-user',
      title: params.title?.trim() || 'New Chat',
      created_at: now,
      updated_at: now,
      agent_id: params.agent_id ?? null,
      agent_version: params.agent_id ? 1 : null,
    };
    mockSessions.unshift(session);
    return mockResponse(session);
  },
  setSessionAgent: async (params) => {
    const session = requireSession(params.session_id);
    Object.assign(session, {
      agent_id: params.agent_id ?? null,
      agent_version: params.agent_id ? 1 : null,
      updated_at: new Date().toISOString(),
    });
    return mockResponse(session);
  },
  renameSession: async ({ session_id, new_title }) => {
    const session = requireSession(session_id);
    session.title = new_title?.trim() || 'New Chat';
    session.updated_at = new Date().toISOString();
    return mockResponse(session);
  },
  deleteSession: async ({ session_id }) => {
    mockSessions = mockSessions.filter((item) => item.id !== session_id);
  },
  listSessions: ({ page = 1, size = 20 }) => {
    const rows = mockSessions.toSorted((a, b) => b.updated_at.localeCompare(a.updated_at));
    return mockResponse({
      list: rows.slice((page - 1) * size, page * size),
      page,
      size,
      total: rows.length,
      total_page: Math.ceil(rows.length / size),
    });
  },
};
