import type { Group } from '@/domains/Group';
import type { ResourceSkillSummary } from '@/domains/Resource';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { computeFileMd5 } from '@/utils/oss/computeFileMd5';
import { parseExtension } from '@/utils/parser/extensionParser';
import { ChatApi, ChatCompletionApi, ChatSessionApi, putOssPresignedUrl } from '@domain-apis';
import type { ChatAgentOption } from '../entity/agent';
import type { WisePenUIMessage } from '../entity/message';
import { buildAgentFromResourceItem } from '../mapper/agent.mapper';
import { selectChatInputWebSearchTools } from '../mapper/capabilityPicker.mapper';
import { ChatServicesMap } from '../mapper/ChatServices.map';
import { mapResourceItemToResourceSkillSummary } from '../mapper/workspace.mapper';
import type {
  BindChatModelProviderRequest,
  ChatInputCapabilityOptions,
  ChatModel,
  ChatModelConfig,
  ChatProvider,
  ChatServiceDeps,
  ChatSession,
  CreateChatProviderRequest,
  CreateChatUserModelRequest,
  CreateSessionRequest,
  DeleteSessionRequest,
  GetChatInputCapabilityOptionsParams,
  IChatService,
  ListChatInputAgentsRequest,
  ListChatInputGroupsRequest,
  ListChatInputSkillsRequest,
  ListHistoryMessagesRequest,
  ListSessionsRequest,
  PageResult,
  RenameSessionRequest,
  SetSessionAgentRequest,
  ToolOption,
  UpdateChatProviderRequest,
  UpdateChatUserModelRequest,
  UpdateUserToolConfigRequest,
  UploadAttachmentParams,
  UploadAttachmentResult,
} from './index.type';

const CHAT_RESOURCE_PAGE_SIZE = 100;

const getModels = async (): Promise<ChatModel[]> => {
  const data = await ChatApi.listAvailableModels();
  return ChatServicesMap.mapGetModelsFromApi(data);
};

const getActiveTurnId = async (sessionId: string): Promise<string | null> => {
  const data = await ChatCompletionApi.getActiveTurn({ session_id: sessionId });
  return ChatServicesMap.mapActiveTurnIdFromApi(data);
};

const cancelTurn = async (sessionId: string): Promise<void> => {
  await ChatCompletionApi.cancelTurn({ session_id: sessionId });
};

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
  deps: ChatServiceDeps,
  params: ListChatInputGroupsRequest
): Promise<PageResult<Group>> => {
  const query = {
    groupRoleFilter: 'ALL' as const,
    page: params.page,
    size: params.size,
  };
  const payload = await deps.groupService.fetchGroupList(query);
  return buildPageResult(payload.groups, params.page, params.size, payload.total);
};

const listChatInputAgents = async (
  deps: ChatServiceDeps,
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
    const list = payload.list.map((item) =>
      buildAgentFromResourceItem(item, {
        groupId: params.groupId!,
        groupName: params.groupName ?? '',
      })
    );
    return buildPageResult(list, payload.page, payload.size, payload.total);
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
  deps: ChatServiceDeps,
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
    const list = payload.list.map((item) =>
      mapResourceItemToResourceSkillSummary(item, {
        groupId: params.groupId!,
        groupName: params.groupName ?? '',
      })
    );
    return buildPageResult(list, payload.page, payload.size, payload.total);
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
  deps: ChatServiceDeps,
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
    getTools(),
  ]);

  return {
    primarySkills: skillsPage.list,
    tools: selectChatInputWebSearchTools(tools),
  };
};

const createSession = async (params?: CreateSessionRequest): Promise<ChatSession> => {
  const payload = ChatServicesMap.mapCreateSessionRequest(params);
  const data = await ChatSessionApi.createSession(payload);
  if (!data) {
    throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_CREATE_SESSION_FAILED);
  }
  return ChatServicesMap.mapCreateSessionFromApi(data);
};

const setSessionAgent = async (params: SetSessionAgentRequest): Promise<ChatSession> => {
  const payload = ChatServicesMap.mapSetSessionAgentRequest(params);
  const data = await ChatSessionApi.setSessionAgent(payload);
  if (!data) {
    throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_CREATE_SESSION_FAILED);
  }
  return ChatServicesMap.mapSetSessionAgentFromApi(data);
};

const renameSession = async (params: RenameSessionRequest): Promise<ChatSession> => {
  const payload = ChatServicesMap.mapRenameSessionRequest(params);
  const data = await ChatSessionApi.renameSession(payload);
  if (!data) {
    throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_RENAME_SESSION_FAILED);
  }
  return ChatServicesMap.mapRenameSessionFromApi(data);
};

const deleteSession = async (params: DeleteSessionRequest): Promise<void> => {
  await ChatSessionApi.deleteSession({ session_id: params.sessionId });
};

const listSessions = async (params?: ListSessionsRequest): Promise<PageResult<ChatSession>> => {
  const query = ChatServicesMap.mapListSessionsRequest(params);
  const payload = await ChatSessionApi.listSessions(query);
  return ChatServicesMap.mapListSessionsFromApi(payload);
};

const listHistoryMessages = async (
  params: ListHistoryMessagesRequest
): Promise<PageResult<WisePenUIMessage>> => {
  const query = ChatServicesMap.mapListHistoryMessagesRequest(params);
  const payload = await ChatSessionApi.listHistoryMessages(query);
  return ChatServicesMap.mapListHistoryMessagesFromApi(payload);
};

const getTools = async (): Promise<ToolOption[]> => {
  const response = await ChatApi.listTools();
  return ChatServicesMap.mapGetToolsFromApi(response);
};

const getUserProviders = async (): Promise<ChatProvider[]> => {
  const response = await ChatApi.listUserProviders();
  return ChatServicesMap.mapUserProvidersFromApi(response);
};

const createUserProvider = async (params: CreateChatProviderRequest): Promise<void> => {
  await ChatApi.createUserProvider({
    name: params.name,
    type: params.type,
    api_key: params.apiKey,
    base_url: params.baseUrl,
    is_active: params.isActive,
  });
};

const updateUserProvider = async (params: UpdateChatProviderRequest): Promise<void> => {
  await ChatApi.updateUserProvider({
    provider_id: params.providerId,
    name: params.name,
    type: params.type,
    api_key: params.apiKey,
    base_url: params.baseUrl,
    is_active: params.isActive,
  });
};

const deleteUserProvider = async (providerId: string): Promise<void> => {
  await ChatApi.deleteUserProvider({ provider_id: providerId });
};

const getUserModels = async (): Promise<ChatModelConfig[]> => {
  const response = await ChatApi.listModels({ model_scope: 'USER' });
  return ChatServicesMap.mapModelConfigsFromApi(response);
};

const getBindableModels = async (): Promise<ChatModelConfig[]> => {
  const response = await ChatApi.listAvailableModels();
  return ChatServicesMap.mapAvailableModelConfigsFromApi(response);
};

const createUserModel = async (params: CreateChatUserModelRequest): Promise<void> => {
  await ChatApi.createUserModel({
    display_name: params.displayName,
    model_family: params.modelFamily,
    billing_ratio: params.billingRatio,
    support_thinking: params.supportThinking,
    support_vision: params.supportVision,
    support_tools: params.supportTools,
    context_window_tokens: params.contextWindowTokens,
    max_output_tokens: params.maxOutputTokens,
  });
};

const updateUserModel = async (params: UpdateChatUserModelRequest): Promise<void> => {
  await ChatApi.updateUserModel({
    model_id: params.modelId,
    display_name: params.displayName,
    model_family: params.modelFamily,
    billing_ratio: params.billingRatio,
    support_thinking: params.supportThinking,
    support_vision: params.supportVision,
    support_tools: params.supportTools,
    context_window_tokens: params.contextWindowTokens,
    max_output_tokens: params.maxOutputTokens,
    is_active: params.isActive,
  });
};

const deleteUserModel = async (modelId: string): Promise<void> => {
  await ChatApi.deleteUserModel({ model_id: modelId });
};

const bindModelProvider = async (params: BindChatModelProviderRequest): Promise<void> => {
  await ChatApi.bindModelProvider({
    model_id: params.modelId,
    provider_id: params.providerId,
    provider_model_name: params.providerModelName,
    is_preferred: params.isPreferred,
    is_active: params.isActive,
  });
};

const unbindModelProvider = async (modelId: string, providerId: string): Promise<void> => {
  await ChatApi.unbindModelProvider({ model_id: modelId, provider_id: providerId });
};

const updateUserToolConfig = async (params: UpdateUserToolConfigRequest): Promise<ToolOption> => {
  const response = await ChatApi.updateUserToolConfig({
    tool_name: params.toolName,
    enabled: params.enabled,
    config: params.config,
    secret_config: params.secretConfig,
  });
  return ChatServicesMap.mapToolFromApi(response);
};

const deleteUserToolConfig = async (toolName: string): Promise<void> => {
  await ChatApi.deleteUserToolConfig({ tool_name: toolName });
};

const uploadAttachment = async ({
  sessionId,
  file,
  saveToLibrary,
}: UploadAttachmentParams): Promise<UploadAttachmentResult> => {
  const md5 = await computeFileMd5(file);
  const extension = parseExtension(file.name);
  const res = await ChatApi.initTemporaryAttachmentUpload({
    session_id: sessionId,
    filename: file.name,
    extension,
    file_size: file.size,
    md5,
    enable_library: Boolean(saveToLibrary),
  });
  if (!res?.attachment_id) {
    throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_ATTACHMENT_UPLOAD_INIT_FAILED);
  }
  if (res.flash_uploaded) {
    return {
      attachmentId: res.attachment_id,
      filename: file.name,
    };
  }
  if (!res.put_url) {
    throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_ATTACHMENT_UPLOAD_INIT_FAILED);
  }
  await putOssPresignedUrl({
    putUrl: res.put_url,
    body: file,
    callbackHeader: res.callback_header ?? '',
  });
  return {
    attachmentId: res.attachment_id,
    filename: file.name,
  };
};

export const createChatServices = (deps: ChatServiceDeps): IChatService => ({
  getModels,
  getActiveTurnId,
  cancelTurn,
  listChatInputGroups: (params) => listChatInputGroups(deps, params),
  listChatInputAgents: (params) => listChatInputAgents(deps, params),
  listChatInputSkills: (params) => listChatInputSkills(deps, params),
  getChatInputCapabilityOptions: (params) => getChatInputCapabilityOptions(deps, params),
  createSession,
  setSessionAgent,
  renameSession,
  deleteSession,
  listSessions,
  listHistoryMessages,
  getTools,
  getUserProviders,
  createUserProvider,
  updateUserProvider,
  deleteUserProvider,
  getUserModels,
  getBindableModels,
  createUserModel,
  updateUserModel,
  deleteUserModel,
  bindModelProvider,
  unbindModelProvider,
  updateUserToolConfig,
  deleteUserToolConfig,
  uploadAttachment,
});
