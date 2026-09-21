import { mockResponse } from '@/domains/_shared/mock/response';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type {
  ChatApi as ChatApiContract,
  ChatCompletionApi as ChatCompletionApiContract,
  ChatSessionApi as ChatSessionApiContract,
} from '../apis/ChatApi';
import type {
  ChatSession as ChatSessionApiModel,
  MessageResponse,
  ModelResponse,
  ProviderApiResponse,
  ToolApiResponse,
} from '../apis/ChatApi.type';

const MOCK_HISTORY_SIZE = 260;
const MOCK_HISTORY_INTERVAL_MS = 45 * 1000;
const MOCK_HISTORY_BASE_TS = Date.parse('2026-03-01T08:00:00.000Z');

let mockSessionSerial = 3;
let mockSessions: ChatSessionApiModel[] = [
  {
    id: 'mock-session-1',
    user_id: 'mock-user',
    title: '项目需求讨论',
    created_at: '2026-04-08T09:00:00Z',
    updated_at: '2026-04-08T09:00:00Z',
  },
  {
    id: 'mock-session-2',
    user_id: 'mock-user',
    title: '接口联调记录',
    created_at: '2026-04-07T10:00:00Z',
    updated_at: '2026-04-07T10:00:00Z',
  },
  {
    id: 'mock-session-3',
    user_id: 'mock-user',
    title: '代码评审',
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
    const text = isUser
      ? `【${sessionId}】第 ${round} 轮：请解释一下这个需求，并给出步骤。`
      : `【${sessionId}】第 ${round} 轮回复：已整理需求背景、约束条件与执行步骤。`;

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
      parts: [{ type: 'text', text, state: 'done' }],
      metadata,
      created_at: createdAt,
    };
  });
};

const mockHistoryMessagesBySessionId: Record<string, MessageResponse[]> = mockSessions.reduce<
  Record<string, MessageResponse[]>
>((acc, session) => {
  acc[session.id] = buildMockHistoryMessages(session.id, MOCK_HISTORY_SIZE);
  return acc;
}, {});

const models: ModelResponse[] = [
  'GPT-4o Mini',
  'DeepSeek V3',
  'Gemini 2.5 Flash',
  'Claude 3.7 Sonnet',
  'o3',
].map((name, i) => ({
  id: `mock-${i < 3 ? 'system' : 'user'}-${i + 1}`,
  scope: i < 3 ? 'SYSTEM' : 'USER',
  display_name: name,
  model_family: 'GENERIC',
  support_thinking: i >= 3,
  support_vision: i !== 1,
  support_tools: true,
  is_active: true,
  mappings: [
    {
      model_id: `mock-${i < 3 ? 'system' : 'user'}-${i + 1}`,
      provider_id: `mock-provider-${i + 1}`,
      provider_name: ['OpenAI', 'DeepSeek', 'Google', 'Anthropic', 'OpenAI'][i],
      provider_model_name: name,
      input_billing_ratio: i === 0 ? '0' : '1',
      cached_input_billing_ratio: i === 0 ? '0' : '1',
      output_billing_ratio: i === 0 ? '0' : '1',
      is_preferred: true,
      is_active: true,
      priority: 0,
    },
  ],
}));
const providers: ProviderApiResponse[] = [];
const tools: ToolApiResponse[] = [
  ['default_web_search', '默认 Web 搜索', true, true],
  ['mock_provider_search', 'Mock 搜索', false, true],
  ['unconfigured_search', '未配置搜索', true, false],
  ['search_user_resources', '搜索用户资源', false, true],
].map(([name, label, requiresConfig, configured]): ToolApiResponse => ({
  name: String(name),
  display_name: String(label),
  description: String(label),
  selection_mode: 'user_selectable',
  enabled: true,
  configured: Boolean(configured),
  requires_config: Boolean(requiresConfig),
  source: { type: 'system', server_id: null, server_display_name: null, remote_name: null },
  config_schema: { type: 'object' },
  secret_fingerprints: configured && requiresConfig ? { api_key: 'mock***key' } : {},
}));
const requireSession = (id: string) => {
  const session = mockSessions.find((item) => item.id === id);
  if (!session) throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_CREATE_SESSION_FAILED);
  return session;
};
const requireTool = (name: string) => {
  const tool = tools.find((item) => item.name === name);
  if (!tool) throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION);
  return tool;
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
      agent_id: params.agent_id,
      agent_version: params.agent_version,
    };
    mockSessions.unshift(session);
    mockHistoryMessagesBySessionId[session.id] = [];
    return mockResponse(session);
  },
  setSessionAgent: async (params) => {
    const session = requireSession(params.session_id);
    Object.assign(session, {
      agent_id: params.agent_id,
      agent_version: params.agent_version,
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
    return null;
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
  cancelTurn: async () => null,
};
export const ChatApi: typeof ChatApiContract = {
  listAvailableModels: () =>
    mockResponse({
      system_models: models.filter((m) => m.scope === 'SYSTEM'),
      user_models: models.filter((m) => m.scope === 'USER'),
    }),
  listModels: ({ model_scope }) =>
    mockResponse({ models: models.filter((m) => m.scope === model_scope) }),
  listTools: () => mockResponse({ tools }),
  initTemporaryAttachmentUpload: async () => ({
    attachment_id: `mock-attachment-${crypto.randomUUID()}`,
    object_key: 'mock/attachment',
    flash_uploaded: true,
  }),
  listUserProviders: () => mockResponse({ providers }),
  createUserProvider: async ({ api_key: _apiKey, ...params }) => {
    providers.push({
      ...params,
      id: `mock-provider-${crypto.randomUUID()}`,
      api_key_fingerprint: 'mock***key',
      scope: 'USER',
      is_active: params.is_active ?? true,
      token_usage: 0,
      billable_token_usage: 0,
    });
    return null;
  },
  updateUserProvider: async ({ provider_id, api_key, ...params }) => {
    const provider = providers.find((p) => p.id === provider_id);
    if (provider)
      Object.assign(
        provider,
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)),
        api_key ? { api_key_fingerprint: 'mock***key' } : {}
      );
    return null;
  },
  deleteUserProvider: async ({ provider_id }) => {
    const i = providers.findIndex((p) => p.id === provider_id);
    if (i >= 0) providers.splice(i, 1);
    return null;
  },
  createUserModel: async (params) => {
    models.push({
      id: `mock-model-${crypto.randomUUID()}`,
      scope: 'USER',
      display_name: params.display_name,
      model_family: params.model_family ?? 'GENERIC',
      support_thinking: params.support_thinking ?? false,
      support_vision: params.support_vision ?? false,
      support_tools: params.support_tools ?? true,
      context_window_tokens: params.context_window_tokens,
      max_output_tokens: params.max_output_tokens,
      is_active: true,
      mappings: [],
    });
    return null;
  },
  updateUserModel: async ({ model_id, ...params }) => {
    const model = models.find((m) => m.id === model_id);
    if (model)
      Object.assign(
        model,
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
      );
    return null;
  },
  deleteUserModel: async ({ model_id }) => {
    const i = models.findIndex((m) => m.id === model_id);
    if (i >= 0) models.splice(i, 1);
    return null;
  },
  bindModelProvider: async (params) => {
    const model = models.find((m) => m.id === params.model_id);
    const provider = providers.find((p) => p.id === params.provider_id);
    if (model && provider)
      model.mappings = [
        ...(model.mappings ?? []).filter((m) => m.provider_id !== provider.id),
        {
          model_id: model.id,
          provider_id: provider.id,
          provider_name: provider.name,
          provider_model_name: params.provider_model_name,
          input_billing_ratio: '1',
          cached_input_billing_ratio: '1',
          output_billing_ratio: '1',
          is_preferred: params.is_preferred ?? true,
          is_active: params.is_active ?? true,
          priority: model.mappings?.length ?? 0,
        },
      ];
    return null;
  },
  unbindModelProvider: async ({ model_id, provider_id }) => {
    const model = models.find((m) => m.id === model_id);
    if (model) model.mappings = model.mappings?.filter((m) => m.provider_id !== provider_id);
    return null;
  },
  updateUserToolConfig: async ({ tool_name, enabled, secret_config }) => {
    const tool = requireTool(tool_name);
    if (enabled !== undefined) tool.enabled = enabled;
    if (secret_config) {
      tool.configured = true;
      tool.secret_fingerprints = { api_key: 'mock***key' };
    }
    return mockResponse(tool);
  },
  deleteUserToolConfig: async ({ tool_name }) => {
    const tool = requireTool(tool_name);
    tool.configured = false;
    tool.secret_fingerprints = {};
    return null;
  },
};
