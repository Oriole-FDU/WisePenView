import { ChatConfigApi } from '@domain-apis';

import type { PageResult } from '@/domains/_shared/entity/page';
import type { Group } from '@/domains/Group';
import type { ResourceSkillSummary } from '@/domains/Resource';

import type { ChatAgentOption } from '../entity/agent';
import { buildAgentFromResourceItem } from '../mapper/agent.mapper';
import { selectChatInputWebSearchTools } from '../mapper/capabilityPicker.mapper';
import { ChatConfigServicesMap } from '../mapper/ChatConfigServices.map';
import { mapResourceItemToResourceSkillSummary } from '../mapper/workspace.mapper';
import type {
  ChatConfigServiceDeps,
  ChatInputCapabilityOptions,
  GetChatInputCapabilityOptionsParams,
  IChatConfigService,
  ListChatInputAgentsRequest,
  ListChatInputGroupsRequest,
  ListChatInputSkillsRequest,
} from './index.type';

const CHAT_RESOURCE_PAGE_SIZE = 100;

const buildPageResult = <T>(
  list: T[],
  page: number,
  size: number,
  total: number
): PageResult<T> => ({
  list,
  total,
  page,
  size,
  totalPage: size > 0 ? Math.max(1, Math.ceil(total / size)) : 1,
});

const listChatInputGroups = async (
  deps: ChatConfigServiceDeps,
  params: ListChatInputGroupsRequest
): Promise<PageResult<Group>> => {
  const payload = await deps.groupService.fetchGroupList({
    groupRoleFilter: 'ALL',
    page: params.page,
    size: params.size,
  });
  return buildPageResult(payload.groups, params.page, params.size, payload.total);
};

const listChatInputAgents = async (
  deps: ChatConfigServiceDeps,
  params: ListChatInputAgentsRequest
): Promise<PageResult<ChatAgentOption>> => {
  const query = {
    page: params.page,
    size: params.size,
    sortBy: 'NAME',
    sortDir: 'ASC',
    resourceType: 'AGENT',
  } as const;

  if (params.scope === 'GROUP') {
    if (!params.groupId) {
      return buildPageResult([], params.page, params.size, 0);
    }
    const payload = await deps.resourceService.getGroupResources({
      ...query,
      groupId: params.groupId,
    });
    return buildPageResult(
      payload.list.map((item) =>
        buildAgentFromResourceItem(item, {
          groupId: params.groupId!,
          groupName: params.groupName ?? '',
        })
      ),
      payload.page,
      payload.size,
      payload.total
    );
  }

  const payload = await deps.resourceService.getUserResources(query);
  return buildPageResult(
    payload.list.map((item) => buildAgentFromResourceItem(item)),
    payload.page,
    payload.size,
    payload.total
  );
};

const listChatInputSkills = async (
  deps: ChatConfigServiceDeps,
  params: ListChatInputSkillsRequest
): Promise<PageResult<ResourceSkillSummary>> => {
  const query = {
    page: params.page,
    size: params.size,
    sortBy: 'NAME',
    sortDir: 'ASC',
    resourceType: 'SKILL',
  } as const;

  if (params.scope === 'GROUP') {
    if (!params.groupId) {
      return buildPageResult([], params.page, params.size, 0);
    }
    const payload = await deps.resourceService.getGroupResources({
      ...query,
      groupId: params.groupId,
    });
    return buildPageResult(
      payload.list.map((item) =>
        mapResourceItemToResourceSkillSummary(item, {
          groupId: params.groupId!,
          groupName: params.groupName ?? '',
        })
      ),
      payload.page,
      payload.size,
      payload.total
    );
  }

  const payload = await deps.resourceService.getUserResources(query);
  return buildPageResult(
    payload.list.map((item) => mapResourceItemToResourceSkillSummary(item)),
    payload.page,
    payload.size,
    payload.total
  );
};

const getChatInputCapabilityOptions = async (
  deps: ChatConfigServiceDeps,
  params: GetChatInputCapabilityOptionsParams
): Promise<ChatInputCapabilityOptions> => {
  const [skillsPage, tools] = await Promise.all([
    listChatInputSkills(
      deps,
      params.agent?.agentType === 'GROUP' && params.agent.groupId
        ? {
            scope: 'GROUP',
            groupId: params.agent.groupId,
            groupName: params.agent.groupName,
            page: 1,
            size: CHAT_RESOURCE_PAGE_SIZE,
          }
        : {
            scope: 'PERSONAL',
            page: 1,
            size: CHAT_RESOURCE_PAGE_SIZE,
          }
    ),
    ChatConfigApi.listTools().then(ChatConfigServicesMap.mapGetToolsFromApi),
  ]);

  return {
    primarySkills: skillsPage.list,
    tools: selectChatInputWebSearchTools(tools),
  };
};

const getModels = async () =>
  ChatConfigServicesMap.mapGetModelsFromApi(await ChatConfigApi.listAvailableModels());

const getTools = async () =>
  ChatConfigServicesMap.mapGetToolsFromApi(await ChatConfigApi.listTools());

const getUserProviders = async () =>
  ChatConfigServicesMap.mapUserProvidersFromApi(await ChatConfigApi.listUserProviders());

const getUserModels = async () =>
  ChatConfigServicesMap.mapModelConfigsFromApi(
    await ChatConfigApi.listModels({ model_scope: 'USER' })
  );

const getBindableModels = async () =>
  ChatConfigServicesMap.mapAvailableModelConfigsFromApi(await ChatConfigApi.listAvailableModels());

export const createChatConfigServices = (deps: ChatConfigServiceDeps): IChatConfigService => ({
  getModels,
  listChatInputGroups: (params) => listChatInputGroups(deps, params),
  listChatInputAgents: (params) => listChatInputAgents(deps, params),
  listChatInputSkills: (params) => listChatInputSkills(deps, params),
  getChatInputCapabilityOptions: (params) => getChatInputCapabilityOptions(deps, params),
  getTools,
  getUserProviders,
  createUserProvider: (params) =>
    ChatConfigApi.createUserProvider({
      name: params.name,
      type: params.type,
      api_key: params.apiKey,
      base_url: params.baseUrl,
      is_active: params.isActive,
    }),
  updateUserProvider: (params) =>
    ChatConfigApi.updateUserProvider({
      provider_id: params.providerId,
      name: params.name,
      type: params.type,
      api_key: params.apiKey,
      base_url: params.baseUrl,
      is_active: params.isActive,
    }),
  deleteUserProvider: (providerId) => ChatConfigApi.deleteUserProvider({ provider_id: providerId }),
  getUserModels,
  getBindableModels,
  createUserModel: (params) =>
    ChatConfigApi.createUserModel({
      display_name: params.displayName,
      model_family: params.modelFamily,
      support_thinking: params.supportThinking,
      support_vision: params.supportVision,
      support_tools: params.supportTools,
      context_window_tokens: params.contextWindowTokens,
      max_output_tokens: params.maxOutputTokens,
    }),
  updateUserModel: (params) =>
    ChatConfigApi.updateUserModel({
      model_id: params.modelId,
      display_name: params.displayName,
      model_family: params.modelFamily,
      support_thinking: params.supportThinking,
      support_vision: params.supportVision,
      support_tools: params.supportTools,
      context_window_tokens: params.contextWindowTokens,
      max_output_tokens: params.maxOutputTokens,
      is_active: params.isActive,
    }),
  deleteUserModel: (modelId) => ChatConfigApi.deleteUserModel({ model_id: modelId }),
  bindModelProvider: (params) =>
    ChatConfigApi.bindModelProvider({
      model_id: params.modelId,
      provider_id: params.providerId,
      provider_model_name: params.providerModelName,
      is_preferred: params.isPreferred,
      is_active: params.isActive,
    }),
  unbindModelProvider: (modelId, providerId) =>
    ChatConfigApi.unbindModelProvider({ model_id: modelId, provider_id: providerId }),
  updateUserToolConfig: async (params) =>
    ChatConfigServicesMap.mapToolFromApi(
      await ChatConfigApi.updateUserToolConfig({
        tool_name: params.toolName,
        enabled: params.enabled,
        config: params.config,
        secret_config: params.secretConfig,
      })
    ),
  deleteUserToolConfig: (toolName) => ChatConfigApi.deleteUserToolConfig({ tool_name: toolName }),
});
