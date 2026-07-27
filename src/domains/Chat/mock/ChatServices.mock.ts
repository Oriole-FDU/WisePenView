import type {
  ChatMessageMetadata,
  ChatSession,
  IChatService,
  ListHistoryMessagesRequest,
  ListSessionsRequest,
  PageResult,
  ToolOption,
  UploadAttachmentParams,
  UploadAttachmentResult,
  WisePenUIMessage,
} from '@/domains/Chat';
import {
  buildAdvancedSkillTreeGroups,
  buildDefaultPersonalAgent,
  getPrimarySkillsForAgent,
  MODEL_TYPE,
} from '@/domains/Chat';
import type { Group } from '@/domains/Group';

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

const providerToName = (provider: string): string => {
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
      const rawModels = [
        ...MOCK_MODELS.slice(0, 3).map((item, i) => ({
          id: `mock-system-${i + 1}`,
          provider_id: `mock-provider-system-${i + 1}`,
          scope: 'system',
          display_name: item.name,
          provider_name: providerToName(item.provider),
          provider_key: item.provider,
          type: MODEL_TYPE.STANDARD_MODEL,
          billing_ratio: 1,
          support_thinking: item.category === 'reasoning',
          support_vision: item.vision,
          support_tools: true,
          is_active: true,
        })),
        ...MOCK_MODELS.slice(3, 5).map((item, i) => ({
          id: `mock-user-${i + 1}`,
          provider_id: `mock-provider-user-${i + 1}`,
          scope: 'user',
          display_name: item.name,
          provider_name: providerToName(item.provider),
          provider_key: item.provider,
          type: MODEL_TYPE.ADVANCED_MODEL,
          billing_ratio: 10,
          support_thinking: true,
          support_vision: item.vision,
          support_tools: true,
          is_active: true,
        })),
      ];
      resolve(
        rawModels.map((item, index) => ({
          id: String(item.id),
          modelId: String(item.id),
          name: item.display_name,
          provider: item.provider_key,
          providerId: item.provider_id,
          providerName: item.provider_name,
          providerModelName: item.display_name,
          providerOptions: [
            {
              providerId: item.provider_id,
              providerName: item.provider_name,
              providerModelName: item.display_name,
              provider: item.provider_key,
              supportRuntimeOptions: {},
              isPreferred: true,
              isActive: true,
              priority: 0,
            },
          ],
          scope: item.scope,
          modelFamily: 'GENERIC',
          ratio: item.billing_ratio,
          supportThinking: item.support_thinking,
          supportTools: item.support_tools,
          tags: [
            ...(item.is_active && index === 0
              ? ([{ text: 'Default', type: 'blue' }] as Array<{ text: string; type: string }>)
              : []),
            ...(item.support_thinking
              ? ([{ text: 'Thinking', type: 'purple' }] as Array<{ text: string; type: string }>)
              : []),
          ],
          isDefault: item.is_active && index === 0,
          vision: item.support_vision,
          usageRank: index + 1,
          contextWindowTokens: null,
          maxOutputTokens: null,
          category:
            item.type === MODEL_TYPE.ADVANCED_MODEL
              ? 'reasoning'
              : item.type === MODEL_TYPE.STANDARD_MODEL
                ? 'all-round'
                : 'chat',
        }))
      );
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
    userId: 'mock-user',
    title: '项目需求讨论',
    createdAt: '2026-04-08T09:00:00Z',
    updatedAt: '2026-04-08T09:00:00Z',
  },
  {
    id: 'mock-session-2',
    userId: 'mock-user',
    title: '接口联调记录',
    createdAt: '2026-04-07T10:00:00Z',
    updatedAt: '2026-04-07T10:00:00Z',
  },
  {
    id: 'mock-session-3',
    userId: 'mock-user',
    title: '代码评审',
    createdAt: '2026-04-06T11:00:00Z',
    updatedAt: '2026-04-06T11:00:00Z',
  },
];

const buildMockHistoryMessages = (sessionId: string, total: number): WisePenUIMessage[] => {
  return Array.from({ length: total }, (_, index) => {
    const messageNo = index + 1;
    const messageSeq = String(messageNo).padStart(4, '0');
    const isUser = messageNo % 2 === 1;
    const round = Math.ceil(messageNo / 2);
    const createdAt = new Date(
      MOCK_HISTORY_BASE_TS + index * MOCK_HISTORY_INTERVAL_MS
    ).toISOString();

    const role: WisePenUIMessage['role'] = isUser ? 'user' : 'assistant';
    const text = isUser
      ? `【${sessionId}】第 ${round} 轮：请解释一下这个需求，并给出步骤。`
      : `【${sessionId}】第 ${round} 轮回复：已整理需求背景、约束条件与执行步骤。`;

    const metadata: ChatMessageMetadata = {
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
    };
  });
};

let mockHistoryMessagesBySessionId: Record<string, WisePenUIMessage[]> = mockSessions.reduce<
  Record<string, WisePenUIMessage[]>
>((acc, session) => {
  acc[session.id] = buildMockHistoryMessages(session.id, MOCK_HISTORY_SIZE);
  return acc;
}, {});

const createSession: IChatService['createSession'] = async (params) => {
  mockSessionSerial += 1;
  const now = nowIso();
  const session: ChatSession = {
    id: `mock-session-${mockSessionSerial}`,
    userId: 'mock-user',
    title: params?.title?.trim() ? params.title : 'New Chat',
    createdAt: now,
    updatedAt: now,
    agentId: params?.agentId,
    agentVersion: params?.agentVersion,
  };
  mockSessions = [session, ...mockSessions];
  mockHistoryMessagesBySessionId = {
    ...mockHistoryMessagesBySessionId,
    [session.id]: [],
  };
  return session;
};

const setSessionAgent: IChatService['setSessionAgent'] = async (params) => {
  const now = nowIso();
  const target = mockSessions.find((session) => session.id === params.sessionId);
  const updated: ChatSession = {
    id: params.sessionId,
    userId: target?.userId ?? 'mock-user',
    title: target?.title ?? 'New Chat',
    createdAt: target?.createdAt ?? now,
    updatedAt: now,
    agentId: params.agentId,
    agentVersion: params.agentVersion,
  };

  mockSessions = mockSessions.map((session) =>
    session.id === params.sessionId ? updated : session
  );
  return updated;
};

const renameSession: IChatService['renameSession'] = async (params) => {
  const now = nowIso();
  const target = mockSessions.find((session) => session.id === params.sessionId);
  const renamed: ChatSession = {
    id: params.sessionId,
    userId: target?.userId ?? 'mock-user',
    title: params.newTitle?.trim() ? params.newTitle : 'New Chat',
    createdAt: target?.createdAt ?? now,
    updatedAt: now,
    agentId: target?.agentId,
    agentVersion: target?.agentVersion,
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
  const sortedSessions = [...mockSessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const total = sortedSessions.length;
  const list = sortedSessions.slice(start, end);

  const result: PageResult<ChatSession> = {
    list,
    total,
    page,
    size,
    totalPage: Math.ceil(total / size),
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

  const end = Math.max(0, total - (page - 1) * size);
  const start = Math.max(0, end - size);
  const list = allMessages.slice(start, end);
  const totalPage = Math.ceil(total / size);

  return {
    list,
    total,
    page,
    size,
    totalPage,
  };
};

const getWorkspace: IChatService['getWorkspace'] = async () => {
  return {
    groups: [
      {
        groupId: '1',
        groupName: '示例小组',
        groupType: 2,
        groupDesc: '',
        groupCoverUrl: '',
        memberCount: 5,
        ownerId: '1',
        createTime: '',
        inviteCode: '',
        tokenUsed: 0,
        tokenBalance: 0,
      },
      {
        groupId: '2',
        groupName: '前端开发组',
        groupType: 2,
        groupDesc: '',
        groupCoverUrl: '',
        memberCount: 12,
        ownerId: '1',
        createTime: '',
        inviteCode: '',
        tokenUsed: 0,
        tokenBalance: 0,
      },
    ] as Group[],
    skills: [
      {
        skillId: 'skill-personal-translation',
        displayName: '翻译助手',
        description: '',
        scopeType: 'PERSONAL' as const,
      },
      {
        skillId: 'skill-personal-summary',
        displayName: '文档总结',
        description: '',
        scopeType: 'PERSONAL' as const,
      },
      {
        skillId: 'skill-personal-math',
        displayName: '数学计算',
        description: '',
        scopeType: 'PERSONAL' as const,
      },
      {
        skillId: 'skill-group-1-weekly',
        displayName: '团队周报生成',
        description: '',
        scopeType: 'GROUP' as const,
        groupId: '1',
        groupName: '示例小组',
      },
      {
        skillId: 'skill-group-1-tracker',
        displayName: '项目进度追踪',
        description: '',
        scopeType: 'GROUP' as const,
        groupId: '1',
        groupName: '示例小组',
      },
      {
        skillId: 'skill-group-2-component',
        displayName: '组件生成器',
        description: '',
        scopeType: 'GROUP' as const,
        groupId: '2',
        groupName: '前端开发组',
      },
      {
        skillId: 'skill-group-2-lint',
        displayName: '样式检查',
        description: '',
        scopeType: 'GROUP' as const,
        groupId: '2',
        groupName: '前端开发组',
      },
    ],
    personalAgents: [
      {
        agentId: 'agent-custom-translation',
        agentType: 'PERSONAL' as const,
        label: '翻译助手Agent',
        source: 'RESOURCE' as const,
        resourceId: 'custom-translation',
        agentVersion: 1,
        isDefault: false,
        defaultSkillIds: ['skill-personal-translation', 'skill-personal-codereview'],
      },
      {
        agentId: 'agent-custom-writing',
        agentType: 'PERSONAL' as const,
        label: '写作Agent',
        source: 'RESOURCE' as const,
        resourceId: 'custom-writing',
        agentVersion: 1,
        isDefault: false,
        defaultSkillIds: ['skill-personal-summary'],
      },
    ],
    groupAgents: [
      {
        agentId: 'agent-group-1-design',
        agentType: 'GROUP' as const,
        label: '设计评审Agent',
        source: 'RESOURCE' as const,
        resourceId: 'group-1-design',
        agentVersion: 1,
        groupId: '1',
        groupName: '示例小组',
        isDefault: false,
        defaultSkillIds: ['skill-group-1-weekly'],
      },
    ],
  };
};

const getChatInputAgents: IChatService['getChatInputAgents'] = async () => {
  const workspace = await getWorkspace();
  return [buildDefaultPersonalAgent(), ...workspace.personalAgents, ...workspace.groupAgents];
};

const getTools = async (): Promise<ToolOption[]> => {
  return [
    {
      toolId: 'search_historical_messages',
      label: 'Search History',
      description: '检索历史会话',
      enabled: true,
      configured: true,
      requiresConfig: false,
    },
    {
      toolId: 'mock-tool-2',
      label: 'Mock Tool 2',
      description: 'Mock Tool',
      enabled: true,
      configured: true,
      requiresConfig: false,
    },
  ];
};

const getChatInputCapabilityOptions: IChatService['getChatInputCapabilityOptions'] = async ({
  agent,
}) => {
  const [workspace, tools] = await Promise.all([getWorkspace(), getTools()]);
  const primarySkills = getPrimarySkillsForAgent(workspace.skills, agent);
  const primaryIds = new Set(primarySkills.map((skill) => skill.skillId));
  const otherSkillGroups = buildAdvancedSkillTreeGroups(
    workspace.skills,
    workspace.groups,
    agent,
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

const uploadAttachment = async ({
  file,
}: UploadAttachmentParams): Promise<UploadAttachmentResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        attachmentId: 'mock-attachment-' + Date.now(),
        filename: file.name,
      });
    }, 500);
  });
};
export const createChatServicesMock = (): IChatService => ({
  getWorkspace,
  getModels,
  getChatInputAgents,
  getChatInputCapabilityOptions,
  createSession,
  setSessionAgent,
  renameSession,
  deleteSession,
  listSessions,
  listHistoryMessages,
  getTools,
  uploadAttachment,
});

export const ChatServicesMock: IChatService = createChatServicesMock();
