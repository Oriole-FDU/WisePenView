import { mockResponse } from '@/domains/_shared/mock/response';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { ChatConfigApi as ChatConfigApiContract } from '../apis/ChatConfigApi';
import type { ModelResponse, ProviderApiResponse } from '../apis/ChatModelApi.schema';
import type { ToolApiResponse } from '../apis/ChatToolApi.schema';

const mockObjectId = (value: number) => String(value).padStart(24, '0');
const createMockObjectId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');

const models: ModelResponse[] = [
  'GPT-4o Mini',
  'DeepSeek V3',
  'Gemini 2.5 Flash',
  'Claude 3.7 Sonnet',
  'o3',
].map((name, index) => ({
  id: mockObjectId(index + 1),
  scope: index < 3 ? 'SYSTEM' : 'USER',
  display_name: name,
  model_family: 'GENERIC',
  support_thinking: index >= 3,
  support_vision: index !== 1,
  support_tools: true,
  context_window_tokens: null,
  max_output_tokens: null,
  is_active: true,
  mappings: [
    {
      model_id: mockObjectId(index + 1),
      provider_id: mockObjectId(index + 101),
      provider_name: ['OpenAI', 'DeepSeek', 'Google', 'Anthropic', 'OpenAI'][index],
      provider_model_name: name,
      input_billing_ratio: index === 0 ? '0' : '1',
      cached_input_billing_ratio: index === 0 ? '0' : '1',
      output_billing_ratio: index === 0 ? '0' : '1',
      support_runtime_options: {},
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
  missing_config_keys: [],
  config_schema: { type: 'object' },
  secret_fingerprints: configured && requiresConfig ? { api_key: 'mock***key' } : {},
}));

const requireTool = (name: string) => {
  const tool = tools.find((item) => item.name === name);
  if (!tool) throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION);
  return tool;
};

export const ChatConfigApi: typeof ChatConfigApiContract = {
  listAvailableModels: () =>
    mockResponse({
      system_models: models.filter((model) => model.scope === 'SYSTEM'),
      user_models: models.filter((model) => model.scope === 'USER'),
    }),
  listModels: ({ model_scope }) =>
    mockResponse({ models: models.filter((model) => model.scope === model_scope) }),
  listTools: () => mockResponse({ tools }),
  listUserProviders: () => mockResponse({ providers }),
  createUserProvider: async ({ api_key: _apiKey, ...params }) => {
    providers.push({
      ...params,
      id: createMockObjectId(),
      api_key_fingerprint: 'mock***key',
      scope: 'USER',
      base_url: params.base_url ?? null,
      is_active: params.is_active ?? true,
      input_tokens: 0,
      cached_input_tokens: 0,
      output_tokens: 0,
      billable_tokens: 0,
    });
  },
  updateUserProvider: async ({ provider_id, api_key, ...params }) => {
    const provider = providers.find((item) => item.id === provider_id);
    if (provider) {
      Object.assign(
        provider,
        Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined)),
        api_key ? { api_key_fingerprint: 'mock***key' } : {}
      );
    }
  },
  deleteUserProvider: async ({ provider_id }) => {
    const index = providers.findIndex((provider) => provider.id === provider_id);
    if (index >= 0) providers.splice(index, 1);
  },
  createUserModel: async (params) => {
    models.push({
      id: createMockObjectId(),
      scope: 'USER',
      display_name: params.display_name,
      model_family: params.model_family ?? 'GENERIC',
      support_thinking: params.support_thinking ?? false,
      support_vision: params.support_vision ?? false,
      support_tools: params.support_tools ?? true,
      context_window_tokens: params.context_window_tokens ?? null,
      max_output_tokens: params.max_output_tokens ?? null,
      is_active: true,
      mappings: [],
    });
  },
  updateUserModel: async ({ model_id, ...params }) => {
    const model = models.find((item) => item.id === model_id);
    if (model) {
      Object.assign(
        model,
        Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined))
      );
    }
  },
  deleteUserModel: async ({ model_id }) => {
    const index = models.findIndex((model) => model.id === model_id);
    if (index >= 0) models.splice(index, 1);
  },
  bindModelProvider: async (params) => {
    const model = models.find((item) => item.id === params.model_id);
    const provider = providers.find((item) => item.id === params.provider_id);
    if (model && provider) {
      model.mappings = [
        ...(model.mappings ?? []).filter((mapping) => mapping.provider_id !== provider.id),
        {
          model_id: model.id,
          provider_id: provider.id,
          provider_name: provider.name,
          provider_model_name: params.provider_model_name,
          input_billing_ratio: '1',
          cached_input_billing_ratio: '1',
          output_billing_ratio: '1',
          support_runtime_options: {},
          is_preferred: params.is_preferred ?? true,
          is_active: params.is_active ?? true,
          priority: model.mappings?.length ?? 0,
        },
      ];
    }
  },
  unbindModelProvider: async ({ model_id, provider_id }) => {
    const model = models.find((item) => item.id === model_id);
    if (model) {
      model.mappings =
        model.mappings?.filter((mapping) => mapping.provider_id !== provider_id) ?? null;
    }
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
  },
};
