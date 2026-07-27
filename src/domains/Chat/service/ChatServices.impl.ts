import type { Group } from '@/domains/Group';
import type { ResourceItem } from '@/domains/Resource';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { computeFileMd5 } from '@/utils/oss/computeFileMd5';
import { putOssPresignedUrl } from '@/utils/oss/ossPresignedPut';
import { parseExtension } from '@/utils/parser/extensionParser';
import { ChatApi, ChatSessionApi } from '../apis/ChatApi';
import type { WisePenUIMessage } from '../entity/message';
import { buildAgentFromResourceItem, buildDefaultPersonalAgent } from '../mapper/agent.mapper';
import { ChatServicesMap } from '../mapper/ChatServices.map';
import {
  buildAdvancedSkillTreeGroups,
  getPrimarySkillsForAgent,
} from '../mapper/skillScope.mapper';
import { mapResourceItemToResourceSkillSummary } from '../mapper/workspace.mapper';
import type {
  ChatInputCapabilityOptions,
  ChatModel,
  ChatServiceDeps,
  ChatSession,
  ChatWorkspace,
  CreateSessionRequest,
  DeleteSessionRequest,
  GetChatInputCapabilityOptionsParams,
  IChatService,
  ListHistoryMessagesRequest,
  ListSessionsRequest,
  PageResult,
  RenameSessionRequest,
  SetSessionAgentRequest,
  ToolOption,
  UploadAttachmentParams,
  UploadAttachmentResult,
} from './index.type';

interface GroupResourceBatch {
  group: Group;
  list: ResourceItem[];
}

const getModels = async (): Promise<ChatModel[]> => {
  const data = await ChatApi.listModels();
  return ChatServicesMap.mapGetModelsFromApi(data);
};

const fetchAllSkills = async (
  deps: ChatServiceDeps,
  groups: Group[]
): Promise<ChatWorkspace['skills']> => {
  const requests = [
    deps.resourceService.getUserResources({
      page: 1,
      size: 200,
      sortBy: 'NAME',
      sortDir: 'ASC',
      resourceType: 'SKILL',
    }),
    ...groups.map((group) =>
      deps.resourceService.getGroupResources({
        groupId: group.groupId,
        page: 1,
        size: 200,
        sortBy: 'NAME',
        sortDir: 'ASC',
        resourceType: 'SKILL',
      })
    ),
  ];

  const results = await Promise.all(requests);
  const [personalResult, ...groupResults] = results;

  return [
    ...(personalResult?.list ?? []).map((item) => mapResourceItemToResourceSkillSummary(item)),
    ...groups.flatMap((group, i) =>
      (groupResults[i]?.list ?? []).map((item) =>
        mapResourceItemToResourceSkillSummary(item, {
          groupId: group.groupId,
          groupName: group.groupName,
        })
      )
    ),
  ];
};

const fetchAllAgents = async (
  deps: ChatServiceDeps,
  groups: Group[]
): Promise<Pick<ChatWorkspace, 'personalAgents' | 'groupAgents'>> => {
  const requests: Array<Promise<ResourceItem[] | GroupResourceBatch>> = [
    deps.resourceService
      .getUserResources({
        page: 1,
        size: 200,
        sortBy: 'NAME',
        sortDir: 'ASC',
        resourceType: 'AGENT',
      })
      .then((res) => res.list),
    ...groups.map((group) =>
      deps.resourceService
        .getGroupResources({
          groupId: group.groupId,
          page: 1,
          size: 200,
          sortBy: 'NAME',
          sortDir: 'ASC',
          resourceType: 'AGENT',
        })
        .then((res): GroupResourceBatch => ({ list: res.list, group }))
    ),
  ];

  const results = await Promise.all(requests);
  const [personalList, ...groupBatches] = results;

  const personalAgents = ((personalList as ResourceItem[]) ?? []).map((item) =>
    buildAgentFromResourceItem(item)
  );

  const groupAgents = (groupBatches as GroupResourceBatch[]).flatMap((batch) =>
    (batch?.list ?? []).map((item) =>
      buildAgentFromResourceItem(item, {
        groupId: batch.group.groupId,
        groupName: batch.group.groupName,
      })
    )
  );

  return { personalAgents, groupAgents };
};

const getWorkspace = async (deps: ChatServiceDeps): Promise<ChatWorkspace> => {
  const groups = await deps.groupService.fetchAllMyGroups();
  const [skills, agentData] = await Promise.all([
    fetchAllSkills(deps, groups),
    fetchAllAgents(deps, groups),
  ]);
  return { groups, skills, ...agentData };
};

const getChatInputAgents = async (
  deps: ChatServiceDeps
): Promise<ChatWorkspace['personalAgents']> => {
  const workspace = await getWorkspace(deps);
  return [buildDefaultPersonalAgent(), ...workspace.personalAgents, ...workspace.groupAgents];
};

const getChatInputCapabilityOptions = async (
  deps: ChatServiceDeps,
  params: GetChatInputCapabilityOptionsParams
): Promise<ChatInputCapabilityOptions> => {
  const [workspace, tools] = await Promise.all([getWorkspace(deps), getTools()]);
  const primarySkills = getPrimarySkillsForAgent(workspace.skills, params.agent);
  const primaryIds = new Set(primarySkills.map((skill) => skill.skillId));
  const otherSkillGroups = buildAdvancedSkillTreeGroups(
    workspace.skills,
    workspace.groups,
    params.agent,
    primarySkills
  )
    .map((group) => ({
      ...group,
      skills: group.skills.filter((skill) => !primaryIds.has(skill.skillId)),
    }))
    .filter((group) => group.skills.length > 0);

  return {
    primarySkills,
    otherSkillGroups,
    tools,
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
  return response.tools.map((tool) => ({
    toolId: tool.name,
    label: tool.name,
    description: tool.description,
    enabled: tool.enabled,
    configured: tool.configured,
    requiresConfig: tool.requires_config,
  }));
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
  if (!res?.put_url || !res.attachment_id) {
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
  getWorkspace: () => getWorkspace(deps),
  getChatInputAgents: () => getChatInputAgents(deps),
  getChatInputCapabilityOptions: (params) => getChatInputCapabilityOptions(deps, params),
  createSession,
  setSessionAgent,
  renameSession,
  deleteSession,
  listSessions,
  listHistoryMessages,
  getTools,
  uploadAttachment,
});
