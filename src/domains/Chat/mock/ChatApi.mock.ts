import { mockResponse } from '@/domains/_shared/mock/response';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type {
  ChatApi as ChatApiContract,
  ChatCompletionApi as ChatCompletionApiContract,
  ChatSessionApi as ChatSessionApiContract,
} from '../apis/ChatApi';
import type {
  ChatSessionApi as ChatSessionApiModel,
  UIMessageApi as MessageResponse,
} from '../apis/ChatSessionApi.schema';

const MOCK_HISTORY_SIZE = 260;
const MOCK_HISTORY_INTERVAL_MS = 45 * 1000;
const MOCK_HISTORY_BASE_TS = Date.parse('2026-03-01T08:00:00.000Z');

/**
 * 原文引用链接（`wisepen://note/<noteId>#p_<blockId>`）的 mock 覆盖。
 *
 * 四个链接分别对应：打开并定位、跨笔记定位、失效块（应提示失败）、非 note 协议（应回落纯文本）。
 * 可用的 blockId 来自 `src/components/editors/note/mock/notePreview.ts` 的 mock 笔记正文。
 */
const MOCK_NOTE_REFERENCE_LINES = [
  '- 参考原文：[顺序表实现](wisepen://note/mock-note-2#p_linear-list-array)',
  '- 参考原文：[课程导学正文](wisepen://note/mock-note-1#p_course-intro-body)',
  '- 已失效的引用：[旧段落](wisepen://note/mock-note-2#p_missing-block)',
  '- 暂不支持的协议：[技能链接](wisepen://skill/mock-skill-1)',
];

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

const buildMockHistoryMessages = (sessionId: string, total: number): MessageResponse[] => {
  return Array.from({ length: total }, (_, index) => {
    const messageNo = index + 1;
    const messageSeq = String(messageNo).padStart(4, '0');
    const isUser = messageNo % 2 === 1;
    const round = Math.ceil(messageNo / 2);
    const createdAt = new Date(
      MOCK_HISTORY_BASE_TS + index * MOCK_HISTORY_INTERVAL_MS
    ).toISOString();

    const role: MessageResponse['role'] = isUser ? 'user' : 'assistant';
    const baseText = isUser
      ? `【${sessionId}】第 ${round} 轮：请解释一下这个需求，并给出步骤。`
      : `【${sessionId}】第 ${round} 轮回复：已整理需求背景、约束条件与执行步骤。`;
    const text =
      !isUser && messageNo === total
        ? `${baseText}\n\n原文引用示例：\n${MOCK_NOTE_REFERENCE_LINES.join('\n')}`
        : baseText;

    const metadata: Record<string, unknown> = {
      createdAt,
      ...(isUser && messageNo === total - 1
        ? {
            selectedAttachments: [
              {
                attachmentId: `${sessionId}-resource-report`,
                filename: 'SlideWise_Report.pdf',
                kind: 'resource',
                available: true,
              },
            ],
          }
        : {}),
    };

    return {
      id: `${sessionId}-msg-${messageSeq}`,
      role,
      parts: [
        {
          type: 'text',
          text,
          state: 'done',
          toolCallId: null,
          input: null,
          output: null,
        },
      ],
      metadata,
      createdAt,
    };
  });
};

const mockHistoryMessagesBySessionId: Record<string, MessageResponse[]> = mockSessions.reduce<
  Record<string, MessageResponse[]>
>((acc, session) => {
  acc[session.id] = buildMockHistoryMessages(session.id, MOCK_HISTORY_SIZE);
  return acc;
}, {});

const requireSession = (id: string) => {
  const session = mockSessions.find((item) => item.id === id);
  if (!session) throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_CREATE_SESSION_FAILED);
  return session;
};
export const ChatSessionApi: typeof ChatSessionApiContract = {
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
    mockHistoryMessagesBySessionId[session.id] = [];
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
    delete mockHistoryMessagesBySessionId[session_id];
  },
  listSessions: ({ page = 1, size = 20 }) => {
    const rows = [...mockSessions].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return mockResponse({
      list: rows.slice((page - 1) * size, page * size),
      page,
      size,
      total: rows.length,
      total_page: Math.ceil(rows.length / size),
    });
  },
  listHistoryMessages: ({ session_id, page = 1, size = 20 }) => {
    const rows = mockHistoryMessagesBySessionId[session_id] ?? [];
    const end = Math.max(0, rows.length - (page - 1) * size);
    return mockResponse({
      list: rows.slice(Math.max(0, end - size), end),
      page,
      size,
      total: rows.length,
      total_page: Math.ceil(rows.length / size),
    });
  },
};
export const ChatCompletionApi: typeof ChatCompletionApiContract = {
  getActiveTurn: async () => ({ turn_id: null }),
  cancelTurn: async () => undefined,
};
export const ChatApi: typeof ChatApiContract = {
  initTemporaryAttachmentUpload: async () => ({
    attachment_id: `mock-attachment-${crypto.randomUUID()}`,
    object_key: 'mock/attachment',
    put_url: 'https://mock-storage.example.invalid/upload',
    callback_header: 'mock-callback',
    flash_uploaded: true,
  }),
};
