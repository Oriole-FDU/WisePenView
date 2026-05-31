import { MODEL_TYPE } from '@/types/model';
import type { IChatService } from '@/domains/Chat';
import type {
  ChatSession,
  ListSessionsRequest,
  ListHistoryMessagesRequest,
  MessageResponse,
  PageResult,
} from '@/domains/Chat';

type MockModelSeed = {
  name: string;
  provider: string;
  category: 'reasoning' | 'general';
  vision: boolean;
};

const MOCK_MODELS: MockModelSeed[] = [
  { name: 'GPT-4o Mini', provider: 'openai', category: 'general', vision: true },
  { name: 'DeepSeek V3', provider: 'deepseek', category: 'general', vision: false },
  { name: 'Gemini 2.5 Flash', provider: 'google', category: 'general', vision: true },
  { name: 'Claude 3.7 Sonnet', provider: 'anthropic', category: 'reasoning', vision: true },
  { name: 'o3', provider: 'openai', category: 'reasoning', vision: true },
  { name: 'Mistral Large', provider: 'mistral', category: 'general', vision: false },
];

const providerToVendor = (provider: string): string => {
  switch (provider) {
    case 'anthropic':
      return 'Anthropic';
    case 'google':
      return 'Google';
    case 'grok':
      return 'xAI';
    case 'deepseek':
      return 'DeepSeek';
    case 'doubao':
      return 'Doubao';
    case 'meta':
      return 'Meta';
    case 'mistral':
      return 'Mistral';
    default:
      return 'OpenAI';
  }
};

const getModels: IChatService['getModels'] = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        standard_models: MOCK_MODELS.slice(0, 3).map((item: MockModelSeed, index: number) => ({
          id: index + 1,
          name: item.name,
          vendor: providerToVendor(item.provider),
          type: MODEL_TYPE.STANDARD_MODEL,
          ratio: 1,
          support_thinking: item.category === 'reasoning',
          support_vision: item.vision,
          is_default: index === 0,
        })),
        advanced_models: MOCK_MODELS.slice(3, 5).map((item: MockModelSeed, index: number) => ({
          id: 101 + index,
          name: item.name,
          vendor: providerToVendor(item.provider),
          type: MODEL_TYPE.ADVANCED_MODEL,
          ratio: 10,
          support_thinking: true,
          support_vision: item.vision,
          is_default: false,
        })),
        other_models: MOCK_MODELS.slice(5).map((item: MockModelSeed, index: number) => ({
          id: 201 + index,
          name: item.name,
          vendor: providerToVendor(item.provider),
          type: MODEL_TYPE.UNKNOWN_MODEL,
          ratio: 1,
          support_thinking: false,
          support_vision: item.vision,
          is_default: false,
        })),
      });
    }, 200);
  });
};

const nowIso = (): string => new Date().toISOString();
const MOCK_HISTORY_SIZE = 260;
const MOCK_HISTORY_INTERVAL_MS = 45 * 1000;
const MOCK_HISTORY_BASE_TS = Date.parse('2026-03-01T08:00:00.000Z');

let mockSessionSerial = 3;
let mockSessions: ChatSession[] = [
  {
    id: 'mock-session-1',
    user_id: 'mock-user',
    title: '项目需求讨论',
    is_pinned: false,
    created_at: '2026-04-08T09:00:00Z',
    updated_at: '2026-04-08T09:00:00Z',
  },
  {
    id: 'mock-session-2',
    user_id: 'mock-user',
    title: '接口联调记录',
    is_pinned: false,
    created_at: '2026-04-07T10:00:00Z',
    updated_at: '2026-04-07T10:00:00Z',
  },
  {
    id: 'mock-session-3',
    user_id: 'mock-user',
    title: '代码评审',
    is_pinned: false,
    created_at: '2026-04-06T11:00:00Z',
    updated_at: '2026-04-06T11:00:00Z',
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

    return {
      id: `${sessionId}-msg-${messageSeq}`,
      role,
      model_id: isUser ? null : 1,
      content: isUser
        ? `【${sessionId}】第 ${round} 轮：请解释一下这个需求，并给出步骤。`
        : `【${sessionId}】第 ${round} 轮回复：已整理需求背景、约束条件与执行步骤。`,
      tool_calls: null,
      created_at: createdAt,
    };
  });
};

let mockHistoryMessagesBySessionId: Record<string, MessageResponse[]> = mockSessions.reduce<
  Record<string, MessageResponse[]>
>((acc, session) => {
  acc[session.id] = buildMockHistoryMessages(session.id, MOCK_HISTORY_SIZE);
  return acc;
}, {});

const createSession: IChatService['createSession'] = async (params) => {
  mockSessionSerial += 1;
  const now = nowIso();
  const session: ChatSession = {
    id: `mock-session-${mockSessionSerial}`,
    user_id: 'mock-user',
    title: params?.title?.trim() ? params.title : 'New Chat',
    is_pinned: false,
    created_at: now,
    updated_at: now,
  };
  mockSessions = [session, ...mockSessions];
  mockHistoryMessagesBySessionId = {
    ...mockHistoryMessagesBySessionId,
    [session.id]: [],
  };
  return session;
};

const renameSession: IChatService['renameSession'] = async (params) => {
  const now = nowIso();
  const target = mockSessions.find((session) => session.id === params.sessionId);
  const renamed: ChatSession = {
    id: params.sessionId,
    user_id: target?.user_id ?? 'mock-user',
    title: params.newTitle?.trim() ? params.newTitle : 'New Chat',
    is_pinned: target?.is_pinned ?? false,
    created_at: target?.created_at ?? now,
    updated_at: now,
  };

  mockSessions = mockSessions.map((session) =>
    session.id === params.sessionId ? renamed : session
  );
  return renamed;
};

const deleteSession: IChatService['deleteSession'] = async (params) => {
  mockSessions = mockSessions.filter((session) => session.id !== params.sessionId);
  const { [params.sessionId]: _removed, ...rest } = mockHistoryMessagesBySessionId;
  mockHistoryMessagesBySessionId = rest;
};

const listSessions: IChatService['listSessions'] = async (params?: ListSessionsRequest) => {
  const page = Math.max(1, params?.page ?? 1);
  const size = Math.max(1, params?.size ?? 20);
  const start = (page - 1) * size;
  const end = start + size;
  const sortedSessions = [...mockSessions].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) {
      return a.is_pinned ? -1 : 1;
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
  const total = sortedSessions.length;
  const list = sortedSessions.slice(start, end);

  const result: PageResult<ChatSession> = {
    list,
    total,
    page,
    size,
    total_page: Math.ceil(total / size),
  };
  return result;
};

const listHistoryMessages: IChatService['listHistoryMessages'] = async (
  params: ListHistoryMessagesRequest
) => {
  const page = Math.max(1, params.page ?? 1);
  const size = Math.max(1, params.size ?? 20);
  const allMessages = mockHistoryMessagesBySessionId[params.sessionId] ?? [];
  const total = allMessages.length;

  // 无限滚动语义：page=1 返回最新一段；page 递增返回更老一段；每段内部保持时间升序。
  const end = Math.max(0, total - (page - 1) * size);
  const start = Math.max(0, end - size);
  const list = allMessages.slice(start, end);
  const totalPage = Math.ceil(total / size);

  return {
    list,
    total,
    page,
    size,
    total_page: totalPage,
  };
};

export const ChatServicesMock: IChatService = {
  getModels,
  createSession,
  renameSession,
  deleteSession,
  listSessions,
  listHistoryMessages,
};
