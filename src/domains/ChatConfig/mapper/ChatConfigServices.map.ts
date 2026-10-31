import type {
  ListAvailableModelsApiResponse,
  ListModelsApiResponse,
  ListUserProvidersApiResponse,
  ModelProviderMappingResponse,
  ModelResponse,
  ProviderApiResponse,
} from '../apis/ChatModelApi.schema';
import type { ListToolsApiResponse, ToolApiResponse } from '../apis/ChatToolApi.schema';
import type {
  ChatModel,
  ChatModelConfig,
  ChatModelProviderOption,
  ChatProvider,
  ToolOption,
} from '../entity/config';

const PROVIDER_KEY_HINTS: Array<{ key: string; patterns: string[] }> = [
  { key: 'anthropic', patterns: ['anthropic', 'claude'] },
  { key: 'google', patterns: ['google', 'gemini'] },
  { key: 'grok', patterns: ['grok', 'xai', 'x.ai'] },
  { key: 'deepseek', patterns: ['deepseek'] },
  { key: 'doubao', patterns: ['doubao', 'bytedance'] },
  { key: 'meta', patterns: ['meta', 'llama'] },
  { key: 'mistral', patterns: ['mistral'] },
  { key: 'zhipu', patterns: ['zhipu', 'chatglm', 'glm', '智谱'] },
  { key: 'openai', patterns: ['openai', 'gpt', 'o1', 'o3', 'o4'] },
  { key: 'qwen', patterns: ['qwen', 'tongyi', 'dashscope', 'alibaba'] },
];

const MODEL_FAMILY_PROVIDER_MAP: Record<string, string> = {
  CLAUDE: 'anthropic',
  GEMINI: 'google',
  GPT: 'openai',
  QWEN: 'qwen',
};

const inferProviderKey = (...values: Array<string | null | undefined>): string => {
  const haystack = values
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();

  const matched = PROVIDER_KEY_HINTS.find((item) =>
    item.patterns.some((pattern) => haystack.includes(pattern))
  );
  return matched?.key ?? 'openai';
};

const normalizeProviderOption = (
  mapping: ModelProviderMappingResponse,
  model: ModelResponse
): ChatModelProviderOption => ({
  providerId: mapping.provider_id,
  providerName: mapping.provider_name,
  providerModelName: mapping.provider_model_name,
  inputBillingRatio: mapping.input_billing_ratio,
  cachedInputBillingRatio: mapping.cached_input_billing_ratio,
  outputBillingRatio: mapping.output_billing_ratio,
  provider: inferProviderKey(
    mapping.provider_name,
    mapping.provider_model_name,
    MODEL_FAMILY_PROVIDER_MAP[model.model_family],
    model.display_name
  ),
  supportRuntimeOptions: mapping.support_runtime_options,
  isPreferred: mapping.is_preferred,
  isActive: mapping.is_active,
  priority: mapping.priority,
});

const getOrderedProviderOptions = (model: ModelResponse): ChatModelProviderOption[] =>
  (model.mappings ?? [])
    .filter((mapping) => mapping.is_active)
    .map((mapping) => normalizeProviderOption(mapping, model))
    .sort((left, right) => {
      if (left.isPreferred !== right.isPreferred) return left.isPreferred ? -1 : 1;
      return (
        left.priority - right.priority ||
        left.providerModelName.localeCompare(right.providerModelName)
      );
    });

const buildSelectionId = (modelId: string, providerId?: string): string =>
  providerId ? `${modelId}:${providerId}` : modelId;

const buildModelTags = (
  model: ModelResponse,
  providerOption: ChatModelProviderOption | undefined,
  index: number
): ChatModel['tags'] => [
  ...(model.is_active && index === 0 ? [{ text: 'Default', type: 'blue' }] : []),
  ...(model.support_thinking ? [{ text: 'Thinking', type: 'purple' }] : []),
  ...(model.support_vision ? [{ text: 'Vision', type: 'green' }] : []),
  ...(providerOption?.isPreferred ? [{ text: 'Preferred', type: 'blue' }] : []),
];

const createFallbackProviderOption = (model: ModelResponse): ChatModelProviderOption => ({
  providerId: '',
  providerName: null,
  providerModelName: model.display_name,
  provider: inferProviderKey(MODEL_FAMILY_PROVIDER_MAP[model.model_family], model.display_name),
  supportRuntimeOptions: {},
  isPreferred: false,
  isActive: true,
  priority: 0,
});

const isFreeModel = (
  model: ModelResponse,
  providerOption: ChatModelProviderOption | undefined
): boolean =>
  model.scope === 'SYSTEM' &&
  providerOption?.inputBillingRatio === '0' &&
  providerOption?.cachedInputBillingRatio === '0' &&
  providerOption?.outputBillingRatio === '0';

const mapModelOption = (
  model: ModelResponse,
  providerOptions: ChatModelProviderOption[],
  providerOption: ChatModelProviderOption | undefined,
  index: number
): ChatModel => ({
  id: buildSelectionId(model.id, providerOption?.providerId || undefined),
  modelId: model.id,
  name: model.display_name,
  provider:
    providerOption?.provider ??
    inferProviderKey(MODEL_FAMILY_PROVIDER_MAP[model.model_family], model.display_name),
  providerId: providerOption?.providerId || undefined,
  providerName: providerOption?.providerName,
  providerModelName: providerOption?.providerModelName,
  providerOptions,
  scope: model.scope,
  modelFamily: model.model_family,
  isFree: isFreeModel(model, providerOption),
  supportThinking: model.support_thinking,
  supportTools: model.support_tools,
  tags: buildModelTags(model, providerOption, index),
  isDefault: model.is_active && index === 0,
  vision: model.support_vision,
  usageRank: index + 1,
  contextWindowTokens: model.context_window_tokens,
  maxOutputTokens: model.max_output_tokens,
});

const mapGetModelsFromApi = (data: ListAvailableModelsApiResponse): ChatModel[] => {
  const groupedModels = [...data.system_models, ...data.user_models].filter(
    (model) => model.is_active
  );
  const modelOptions: ChatModel[] = [];

  groupedModels.forEach((model) => {
    const providerOptions = getOrderedProviderOptions(model);
    const options =
      providerOptions.length > 0 ? providerOptions : [createFallbackProviderOption(model)];

    options.forEach((providerOption) => {
      const effectiveProviderOptions = providerOptions.length > 0 ? providerOptions : [];
      modelOptions.push(
        mapModelOption(model, effectiveProviderOptions, providerOption, modelOptions.length)
      );
    });
  });

  const firstFreeModelIndex = modelOptions.findIndex((model) => model.isFree);
  const defaultModelIndex =
    firstFreeModelIndex >= 0
      ? firstFreeModelIndex
      : modelOptions.findIndex((model) => model.isDefault);

  return modelOptions.map((model, index) => ({
    ...model,
    isDefault: index === defaultModelIndex,
  }));
};

const mapGetToolsFromApi = (data: ListToolsApiResponse): ToolOption[] =>
  data.tools.map((tool) => ({
    toolId: tool.name,
    label: tool.display_name,
    displayName: tool.display_name,
    description: tool.description,
    selectionMode: tool.selection_mode,
    enabled: tool.enabled,
    configured: tool.configured,
    requiresConfig: tool.requires_config,
    source: tool.source
      ? {
          type: tool.source.type,
          serverId: tool.source.server_id,
          serverDisplayName: tool.source.server_display_name,
          remoteName: tool.source.remote_name,
        }
      : null,
    configSchema: tool.config_schema,
    secretFingerprints: tool.secret_fingerprints,
  }));

const mapToolFromApi = (tool: ToolApiResponse): ToolOption =>
  mapGetToolsFromApi({ tools: [tool] })[0];

const mapProviderFromApi = (provider: ProviderApiResponse): ChatProvider => ({
  id: provider.id,
  name: provider.name,
  baseUrl: provider.base_url,
  apiKeyFingerprint: provider.api_key_fingerprint,
  scope: provider.scope,
  type: provider.type,
  isActive: provider.is_active,
  inputTokenUsage: provider.input_tokens,
  cachedInputTokenUsage: provider.cached_input_tokens,
  outputTokenUsage: provider.output_tokens,
  billableTokenUsage: provider.billable_tokens,
});

const mapUserProvidersFromApi = (data: ListUserProvidersApiResponse): ChatProvider[] =>
  data.providers.map(mapProviderFromApi);

const mapModelConfigFromApi = (model: ModelResponse): ChatModelConfig => ({
  id: model.id,
  scope: model.scope,
  displayName: model.display_name,
  modelFamily: model.model_family,
  supportThinking: model.support_thinking,
  supportVision: model.support_vision,
  supportTools: model.support_tools,
  contextWindowTokens: model.context_window_tokens,
  maxOutputTokens: model.max_output_tokens,
  isActive: model.is_active,
  mappings: (model.mappings ?? []).map((mapping) => ({
    providerId: mapping.provider_id,
    providerName: mapping.provider_name,
    providerModelName: mapping.provider_model_name,
    inputBillingRatio: mapping.input_billing_ratio,
    cachedInputBillingRatio: mapping.cached_input_billing_ratio,
    outputBillingRatio: mapping.output_billing_ratio,
    isPreferred: mapping.is_preferred,
    isActive: mapping.is_active,
    priority: mapping.priority,
  })),
});

const mapModelConfigsFromApi = (data: ListModelsApiResponse): ChatModelConfig[] =>
  data.models.map(mapModelConfigFromApi);

const mapAvailableModelConfigsFromApi = (data: ListAvailableModelsApiResponse): ChatModelConfig[] =>
  [...data.system_models, ...data.user_models].map(mapModelConfigFromApi);

export const ChatConfigServicesMap = {
  mapGetModelsFromApi,
  mapGetToolsFromApi,
  mapToolFromApi,
  mapUserProvidersFromApi,
  mapModelConfigsFromApi,
  mapAvailableModelConfigsFromApi,
};
