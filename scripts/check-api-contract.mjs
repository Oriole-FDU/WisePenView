import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';
import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'check-api-contract-'));

try {
  const outfile = join(tempDir, 'runtime-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { assertApiPage, isApiResponseEnvelope } from '@/apis/runtimeContract';
        export { ChatServicesMap } from '@/domains/Chat/mapper/ChatServices.map';
        export { AdminUserServicesMap } from '@/domains/Admin/mapper/AdminUserServices.map';
        export { AgentServicesMap } from '@/domains/Agent/mapper/AgentServices.map';
        export { AdminMessageServicesMap } from '@/domains/Admin/mapper/AdminMessageServices.map';
        export { DocumentServicesMap } from '@/domains/Document/mapper/DocumentServices.map';
        export { GroupServicesMap } from '@/domains/Group/mapper/GroupServices.map';
        export { ImageServicesMap } from '@/domains/Image/mapper/ImageServices.map';
        export { InlineCommentServicesMap } from '@/domains/InlineComment/mapper/InlineCommentServices.map';
        export { InteractServicesMap } from '@/domains/Interact/mapper/InteractServices.map';
        export { MessageServicesMap } from '@/domains/Message/mapper/MessageServices.map';
        export { ResourceServicesMap } from '@/domains/Resource/mapper/ResourceServices.map';
        export { SkillServicesMap } from '@/domains/Skill/mapper/SkillServices.map';
        export { mapUploadTickets, validateVersionBundle } from '@/domains/_shared/mapper/versionAsset.map';
        export { mapOssStsToken } from '@/domains/_shared/mapper/ossSts.map';
        export { SpeechServicesMap } from '@/domains/Speech/mapper/SpeechServices.map';
        export { TagServicesMap } from '@/domains/Tag/mapper/TagServices.map';
        export { UserServicesMap } from '@/domains/User/mapper/UserServices.map';
        export { normalizeChatSseData, normalizeChatSseResponse } from '@/domains/Chat/session/chatSseNormalizer';
      `,
      resolveDir: root,
    },
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    alias: { '@': join(root, 'src') },
  });

  const {
    assertApiPage,
    isApiResponseEnvelope,
    ChatServicesMap,
    AdminUserServicesMap,
    AgentServicesMap,
    AdminMessageServicesMap,
    DocumentServicesMap,
    GroupServicesMap,
    ImageServicesMap,
    InlineCommentServicesMap,
    InteractServicesMap,
    MessageServicesMap,
    ResourceServicesMap,
    SkillServicesMap,
    SpeechServicesMap,
    TagServicesMap,
    UserServicesMap,
    mapOssStsToken,
    mapUploadTickets,
    validateVersionBundle,
    normalizeChatSseData,
    normalizeChatSseResponse,
  } = await import(pathToFileURL(outfile).href);
  assert(isApiResponseEnvelope({ code: 200, key: null, msg: null, data: null }));
  assert(isApiResponseEnvelope({ code: 200, msg: 'ok', data: { id: 'resource' } }));
  assert(!isApiResponseEnvelope({ code: Number.NaN, msg: 'ok', data: null }));
  assert(!isApiResponseEnvelope({ code: Number.POSITIVE_INFINITY, msg: 'ok', data: null }));
  assert(!isApiResponseEnvelope({ code: '200', msg: 'ok', data: null }));
  assert(!isApiResponseEnvelope({ code: 200, msg: 0, data: null }));
  assert(!isApiResponseEnvelope({ code: 200, key: 1, msg: null, data: null }));
  assert(!isApiResponseEnvelope({ code: 200, msg: null, data: null }));
  assert(!isApiResponseEnvelope({ code: 200, key: 'java', msg: 0, data: null }));
  assert(!isApiResponseEnvelope([]));

  const rejects = (run) =>
    assert.throws(run, (error) => error.name === 'WisePenError' && error.code === 16);
  const page = (list) => ({
    list,
    total: list.length,
    page: 1,
    size: 20,
    total_page: Math.ceil(list.length / 20),
  });
  assert.doesNotThrow(() =>
    assertApiPage({ list: [], total: 0, page: 1, size: 20, totalPage: 0 }, () => true)
  );
  assert.deepEqual(
    assertApiPage(
      { list: [1], total: '1', page: 1, size: 20, totalPage: 1 },
      (value) => value === 1
    ),
    { list: [1], total: 1, page: 1, size: 20, totalPage: 1 }
  );
  for (const payload of [
    { list: [], total: -1, page: 1, size: 20, totalPage: 0 },
    { list: [], total: '', page: 1, size: 20, totalPage: 0 },
    { list: [], total: 'abc', page: 1, size: 20, totalPage: 0 },
    { list: [], total: '1.5', page: 1, size: 20, totalPage: 0 },
    { list: [], total: 0, page: 0, size: 20, totalPage: 0 },
    { list: [], total: 0, page: 1.5, size: 20, totalPage: 0 },
    { list: [], total: 0, page: 1, size: 0, totalPage: 0 },
    { list: [], total: 1, page: 1, size: 2, totalPage: 2 },
    { list: [1, 2, 3], total: 3, page: 1, size: 2, totalPage: 2 },
    { list: [1], total: 1, page: 2, size: 1, totalPage: 1 },
  ]) {
    rejects(() => assertApiPage(payload, (value) => typeof value === 'number'));
  }
  const history = { id: 'message-1', role: 'assistant', parts: [{ type: 'text', text: 'ok' }] };
  const mapHistory = (payload) => ChatServicesMap.mapListHistoryMessagesFromApi(payload);
  assert.deepEqual(mapHistory(page([history])).list[0].parts, [{ type: 'text', text: 'ok' }]);
  for (const payload of [
    null,
    {},
    { ...page([]), total: NaN },
    page([null]),
    page([{ ...history, id: undefined }]),
    page([{ ...history, role: 'tool' }]),
    page([{ ...history, parts: null }]),
    page([{ ...history, parts: [null] }]),
    page([{ ...history, parts: [{ type: 'text', text: 42 }] }]),
    page([{ ...history, parts: [{ type: 'tool-search', state: 'output-available' }] }]),
  ]) {
    rejects(() => mapHistory(payload));
  }
  const mixedParts = [
    { type: 'step-start' },
    { type: 'reasoning', text: 'thinking', state: 'done' },
    {
      type: 'tool-search',
      toolCallId: 'call-1',
      state: 'output-available',
      input: { arbitrary: [1] },
      output: ['result'],
    },
    { type: 'future-part', arbitrary: true },
    { type: 'text', text: 'answer' },
  ];
  assert.deepEqual(
    mapHistory(page([{ ...history, parts: mixedParts }])).list[0].parts,
    mixedParts.filter((part) => part.type !== 'future-part')
  );
  assert.equal(
    mapHistory(page([{ ...history, createdAt: 123, metadata: [] }])).list[0].metadata,
    undefined
  );
  assert.equal(
    mapHistory(page([{ ...history, createdAt: '2026-10-14', metadata: { modelId: 42 } }])).list[0]
      .metadata.createdAt,
    '2026-10-14'
  );

  const session = {
    id: 'session-1',
    user_id: 'user-1',
    title: 'Chat',
    created_at: '2026-10-14',
    updated_at: '2026-10-14',
    temporary_attachment_refs: [
      {
        attachment_id: 'temp-1',
        attachment_type: 'temporary',
        attachment_name: 'test.txt',
        object_key: 'test',
        extension: 'txt',
        file_size: 10,
      },
    ],
    resource_attachment_refs: [
      {
        attachment_id: 'ref-1',
        attachment_type: 'resource',
        attachment_name: 'Note',
        resource_id: 'note-1',
        resource_type: 'NOTE',
      },
    ],
    last_selected_skill_ids: ['skill-1'],
    last_tool_selection_overrides: { search: false },
  };
  const mapSession = ChatServicesMap.mapCreateSessionFromApi;
  assert.equal(mapSession(session).temporaryAttachmentRefs[0].objectKey, 'test');
  assert.equal(mapSession(session).resourceAttachmentRefs[0].resourceId, 'note-1');
  assert.deepEqual(mapSession(session).lastSelectedSkillIds, ['skill-1']);
  assert.deepEqual(mapSession(session).lastToolSelectionOverrides, { search: false });
  const agentSpec = {
    system_prompt: 'system',
    auto_generate_title: true,
    model_policy: { allow_request_override: true },
    tool_and_skill_policy: {
      enable_use_tool: true,
      tool_selection_default_enabled: true,
      tool_selection_overrides: {},
      enable_use_skill: true,
    },
    memory_policy: {
      enable_chat_memory: true,
      enable_persistence_chat_memory: true,
      enable_chat_memory_summary: true,
      enable_long_term_memory: true,
    },
  };
  const sessionWithAgent = {
    ...session,
    agent: {
      agent_id: 'agent-1',
      name: 'Agent',
      description: '',
      source_type: 'USER',
      version: 1,
      version_status: 'PUBLISHED',
      spec: agentSpec,
    },
  };
  assert.equal(mapSession(sessionWithAgent).agent.spec.systemPrompt, 'system');
  rejects(() =>
    mapSession({ ...sessionWithAgent, agent: { ...sessionWithAgent.agent, spec: {} } })
  );
  for (const key of [
    'id',
    'user_id',
    'title',
    'created_at',
    'updated_at',
    'temporary_attachment_refs',
    'resource_attachment_refs',
    'last_selected_skill_ids',
    'last_tool_selection_overrides',
  ]) {
    rejects(() => mapSession({ ...session, [key]: undefined }));
  }
  for (const payload of [
    null,
    { ...session, temporary_attachment_refs: [null] },
    { ...session, resource_attachment_refs: [{}] },
    { ...session, last_selected_skill_ids: [1] },
    { ...session, last_tool_selection_overrides: { search: 'false' } },
  ])
    rejects(() => mapSession(payload));
  const optionalSession = mapSession({
    ...session,
    agent_id: 4,
    agent_version: '2',
    agent: null,
    last_tool_selection_default_enabled: 1,
    temporary_attachment_refs: [{ ...session.temporary_attachment_refs[0], mime_type: 42 }],
  });
  assert.equal(optionalSession.agentId, undefined);
  assert.equal(optionalSession.agentVersion, undefined);
  assert.equal(optionalSession.agent, null);
  assert.equal(optionalSession.lastToolSelectionDefaultEnabled, undefined);
  assert.equal(optionalSession.temporaryAttachmentRefs[0].mimeType, undefined);
  for (const agent of [[], 'invalid', 1]) rejects(() => mapSession({ ...session, agent }));
  rejects(() =>
    mapSession({
      ...sessionWithAgent,
      agent: {
        ...sessionWithAgent.agent,
        spec: {
          ...agentSpec,
          tool_and_skill_policy: {
            ...agentSpec.tool_and_skill_policy,
            on_demand_skill_ids: 'not-an-array',
          },
        },
      },
    })
  );
  assert.equal(ChatServicesMap.mapListSessionsFromApi(page([session])).list.length, 1);
  rejects(() => ChatServicesMap.mapListSessionsFromApi({ ...page([]), page: '1' }));
  rejects(() => ChatServicesMap.mapRenameSessionFromApi({}));
  rejects(() => ChatServicesMap.mapSetSessionAgentFromApi({}));
  assert.deepEqual(
    ChatServicesMap.mapCreateSessionRequest({ agentId: 'agent-1', agentVersion: 3 }),
    { agent_id: 'agent-1' }
  );
  assert.deepEqual(
    ChatServicesMap.mapSetSessionAgentRequest({
      sessionId: 'session-1',
      agentId: null,
      agentVersion: 3,
    }),
    { session_id: 'session-1', agent_id: null }
  );

  const mapping = {
    model_id: 'model-1',
    provider_id: 'provider-1',
    provider_model_name: 'Model',
    support_runtime_options: { custom: [1] },
    is_preferred: true,
    is_active: true,
    priority: 1,
  };
  const model = {
    id: 'model-1',
    scope: 'SYSTEM',
    display_name: 'Model',
    model_family: 'GENERIC',
    billing_ratio: 0,
    support_thinking: false,
    support_vision: false,
    support_tools: true,
    is_active: true,
    mappings: [mapping],
  };
  const models = (item) => ({ system_models: [item], user_models: [] });
  assert.equal(ChatServicesMap.mapGetModelsFromApi(models(model))[0].isFree, true);
  assert.equal(
    ChatServicesMap.mapGetModelsFromApi(models({ ...model, billing_ratio: 2 }))[0].isFree,
    false
  );
  assert.equal(ChatServicesMap.mapModelConfigsFromApi({ models: [model] })[0].billingRatio, 0);
  assert.equal(
    ChatServicesMap.mapAvailableModelConfigsFromApi(models({ ...model, mappings: null }))[0]
      .mappings.length,
    0
  );
  for (const key of [
    'id',
    'scope',
    'display_name',
    'model_family',
    'billing_ratio',
    'support_thinking',
    'support_vision',
    'support_tools',
    'is_active',
    'mappings',
  ]) {
    rejects(() => ChatServicesMap.mapGetModelsFromApi(models({ ...model, [key]: undefined })));
  }
  for (const bad of ['0', NaN, Infinity])
    rejects(() => ChatServicesMap.mapGetModelsFromApi(models({ ...model, billing_ratio: bad })));
  rejects(() => ChatServicesMap.mapModelConfigsFromApi({ models: {} }));
  rejects(() =>
    ChatServicesMap.mapAvailableModelConfigsFromApi({ system_models: null, user_models: [] })
  );
  rejects(() => ChatServicesMap.mapGetModelsFromApi(models({ ...model, mappings: [null] })));
  const optionalModel = ChatServicesMap.mapGetModelsFromApi(
    models({
      ...model,
      context_window_tokens: '100',
      max_output_tokens: NaN,
      mappings: [{ ...mapping, provider_name: {} }],
    })
  )[0];
  assert.equal(optionalModel.contextWindowTokens, undefined);
  assert.equal(optionalModel.maxOutputTokens, undefined);
  assert.equal(optionalModel.providerName, undefined);
  assert.deepEqual(optionalModel.providerOptions[0].supportRuntimeOptions, { custom: [1] });

  const provider = {
    id: 'p1',
    name: 'Provider',
    scope: 'USER',
    type: 'OPENAI',
    is_active: true,
    token_usage: 25,
    billable_token_usage: 30,
  };
  assert.equal(
    ChatServicesMap.mapUserProvidersFromApi({ providers: [provider] })[0].billableTokenUsage,
    30
  );
  for (const key of [
    'id',
    'name',
    'scope',
    'type',
    'is_active',
    'token_usage',
    'billable_token_usage',
  ]) {
    rejects(() =>
      ChatServicesMap.mapUserProvidersFromApi({ providers: [{ ...provider, [key]: undefined }] })
    );
  }
  assert.equal(
    ChatServicesMap.mapUserProvidersFromApi({ providers: [{ ...provider, base_url: 1 }] })[0]
      .baseUrl,
    null
  );
  const tool = {
    name: 'search',
    display_name: 'Search',
    description: '',
    selection_mode: 'user_selectable',
    enabled: true,
    configured: true,
    requires_config: false,
    source: null,
    config_schema: { arbitrary: { nested: [1] } },
    secret_fingerprints: {},
  };
  assert.deepEqual(ChatServicesMap.mapToolFromApi(tool).configSchema, tool.config_schema);
  rejects(() => ChatServicesMap.mapGetToolsFromApi({ tools: null }));
  rejects(() => ChatServicesMap.mapToolFromApi({ ...tool, config_schema: [] }));
  assert.equal(ChatServicesMap.mapActiveTurnIdFromApi({ turn_id: null }), null);
  rejects(() => ChatServicesMap.mapActiveTurnIdFromApi({}));

  const mapProfile = AdminUserServicesMap.mapGetAdminUserInfoFromApi;
  assert.equal(
    mapProfile({ userId: 42, sex: 'UNKNOWN', enrollmentYear: 2024 }).userProfile.userId,
    '42'
  );
  assert.equal(
    mapProfile({ userId: '42', enrollmentYear: 2024 }).userProfile.enrollmentYear,
    '2024'
  );
  for (const payload of [null, [], {}, { userId: NaN }, { userId: {} }])
    rejects(() => mapProfile(payload));
  assert.deepEqual(
    mapProfile({
      userId: '42',
      sex: 'INVALID',
      degreeLevel: 'INVALID',
      university: 123,
      enrollmentYear: '2024',
      college: null,
      extra: 'must not leak',
    }).userProfile,
    { userId: '42' }
  );
  assert.deepEqual(
    AdminUserServicesMap.mapFetchAdminUserListRequest({
      page: 1,
      size: 20,
      keyword: '',
      status: -2,
      identityType: 0,
    }),
    { page: 1, size: 20, keyword: '', userStatus: 'BANNED' }
  );
  assert.equal(
    AdminUserServicesMap.mapAdminUserListFromApi([
      { userId: '42', username: 'person', userStatus: 'BANNED' },
    ])[0].status,
    -2
  );

  const emptyPage = { list: [], total: 0, page: 1, size: 20, totalPage: 0 };
  assert.equal(AdminMessageServicesMap.mapListAdminMessagesFromApi(emptyPage).total, 0);
  rejects(() => AdminMessageServicesMap.mapListAdminMessagesFromApi({ ...emptyPage, page: '1' }));
  assert.deepEqual(DocumentServicesMap.mapListPendingDocsFromApi([]), []);
  rejects(() => DocumentServicesMap.mapListPendingDocsFromApi(null));
  assert.equal(GroupServicesMap.mapFetchGroupListFromApi(emptyPage).groups.length, 0);
  assert.equal(GroupServicesMap.mapFetchGroupListFromApi({ ...emptyPage, total: '0' }).total, 0);
  rejects(() => GroupServicesMap.mapFetchGroupListFromApi({ list: [] }));
  assert.equal(
    ResourceServicesMap.mapResourceListPageFromApi({ ...emptyPage, total: '0' }).total,
    0
  );
  assert.equal(
    GroupServicesMap.mapFetchGroupMembersFromApi({
      list: [
        {
          role: 0,
          joinTime: 1791993600000,
          tokenLimit: '0',
          tokenUsed: '0',
          groupId: 'group-1',
          memberId: 'user-1',
          memberInfo: { nickname: 'member' },
        },
      ],
      total: 1,
      page: 1,
      size: 20,
      totalPage: 1,
    }).members[0].joinTime,
    '1791993600000'
  );
  assert.equal(
    ImageServicesMap.mapImageUploadFromApi({ domain: 'https://img.test', objectKey: 'a.png' })
      .record.objectKey,
    'a.png'
  );
  rejects(() => ImageServicesMap.mapImageUploadFromApi({ domain: 'https://img.test' }));
  assert.deepEqual(InlineCommentServicesMap.mapListFromApi([]), []);
  rejects(() => InlineCommentServicesMap.mapListFromApi({}));
  assert.equal(InteractServicesMap.mapCommentPageFromApi(emptyPage).items.length, 0);
  rejects(() => InteractServicesMap.mapCommentPageFromApi({ ...emptyPage, list: [{}] }));
  assert.equal(MessageServicesMap.mapListUserMessagesFromApi(emptyPage).messages.length, 0);
  rejects(() => MessageServicesMap.mapListUserMessagesFromApi({ ...emptyPage, total: null }));
  const emptyBundle = { version: 1, status: 'DRAFT', assets: [] };
  assert.deepEqual(SkillServicesMap.mapSkillFilesFromApi(emptyBundle), []);
  rejects(() => SkillServicesMap.mapSkillFilesFromApi({ ...emptyBundle, assets: {} }));
  rejects(() => validateVersionBundle({ ...emptyBundle, version: undefined }));
  assert.equal(
    mapUploadTickets({
      resourceId: 'r1',
      version: 1,
      assetUploadTickets: [
        {
          assetId: 'a1',
          objectKey: 'key',
          putUrl: 'https://upload.test',
          callbackHeader: 'callback',
        },
      ],
    }).length,
    1
  );
  rejects(() => mapUploadTickets({ resourceId: 'r1', version: 1, assetUploadTickets: [{}] }));
  const sts = {
    accessKeyId: 'id',
    accessKeySecret: 'secret',
    securityToken: 'token',
    bucket: 'bucket',
    region: 'region',
  };
  assert.equal(mapOssStsToken(sts).bucket, 'bucket');
  rejects(() => mapOssStsToken({ ...sts, accessKeySecret: undefined }));
  const speechRequest = { eosMs: 3000 };
  assert.equal(
    SpeechServicesMap.mapRecognitionCredentialFromApi(
      {
        provider: 'IFLYTEK',
        expires_at: '2030-01-01',
        credential: { url: 'wss://iat-api.xfyun.cn/v2/iat', common: { app_id: 'app' } },
      },
      speechRequest
    ).provider,
    'IFLYTEK'
  );
  rejects(() =>
    SpeechServicesMap.mapRecognitionCredentialFromApi(
      { provider: 'IFLYTEK', expires_at: '2030-01-01', credential: {} },
      speechRequest
    )
  );
  assert.deepEqual(TagServicesMap.mapTagTreeFromApi([]), []);
  rejects(() => TagServicesMap.mapTagTreeFromApi([{}]));
  assert.deepEqual(UserServicesMap.mapSearchUsersFromApi([]), []);
  assert.equal(
    UserServicesMap.mapSearchUsersFromApi([{ userId: 'u1', username: 'user.one' }])[0].userId,
    'u1'
  );
  for (const user of [
    null,
    {},
    { userId: '', username: 'user.one' },
    { userId: 'u1' },
    { userId: 'u1', username: '' },
    { userId: {}, username: 'user.one' },
  ]) {
    rejects(() => UserServicesMap.mapSearchUsersFromApi([user]));
  }
  rejects(() => UserServicesMap.mapTaskStatusesFromApi([{}]));
  const validAgentSpec = {
    systemPrompt: 'system',
    autoGenerateTitle: true,
    modelPolicy: { allowRequestOverride: true },
    toolAndSkillPolicy: {
      enableUseTool: true,
      toolSelectionDefaultEnabled: true,
      enableUseSkill: true,
    },
    memoryPolicy: {
      enableChatMemory: true,
      enablePersistenceChatMemory: true,
      enableChatMemorySummary: true,
      enableLongTermMemory: true,
    },
  };
  const mappedAgentSpec = AgentServicesMap.mapSpec(validAgentSpec);
  assert.equal(mappedAgentSpec.systemPrompt, 'system');
  assert.equal(mappedAgentSpec.toolAndSkillPolicy.skillMatchTopK, 3);
  const fallbackSpec = AgentServicesMap.mapSpec(null);
  const secondFallbackSpec = AgentServicesMap.mapSpec(undefined);
  assert.notEqual(fallbackSpec.modelPolicy, secondFallbackSpec.modelPolicy);
  assert.notEqual(fallbackSpec.toolAndSkillPolicy, secondFallbackSpec.toolAndSkillPolicy);
  assert.notEqual(fallbackSpec.memoryPolicy, secondFallbackSpec.memoryPolicy);
  for (const spec of [
    {},
    { ...validAgentSpec, systemPrompt: undefined },
    { ...validAgentSpec, autoGenerateTitle: undefined },
    { ...validAgentSpec, modelPolicy: undefined },
    { ...validAgentSpec, toolAndSkillPolicy: undefined },
    { ...validAgentSpec, memoryPolicy: undefined },
    {
      ...validAgentSpec,
      toolAndSkillPolicy: { ...validAgentSpec.toolAndSkillPolicy, enableUseTool: undefined },
    },
    { ...validAgentSpec, agentMaxIterations: 10 },
    { ...validAgentSpec, agentMaxIterations: 1.5 },
    {
      ...validAgentSpec,
      toolAndSkillPolicy: { ...validAgentSpec.toolAndSkillPolicy, skillMatchTopK: 30 },
    },
    {
      ...validAgentSpec,
      toolAndSkillPolicy: { ...validAgentSpec.toolAndSkillPolicy, skillMatchTopK: -1 },
    },
  ]) {
    rejects(() => AgentServicesMap.mapSpec(spec));
  }
  // 后端固定字段、SDK 已知事件及从中间帧重放的边界。
  const sseEvents = [
    { type: 'start', messageId: 'm1' },
    { type: 'start-step' },
    { type: 'text-start', id: 'p1' },
    { type: 'text-delta', id: 'p1', delta: '你好' },
    { type: 'text-end', id: 'p1' },
    { type: 'reasoning-start', id: 'r1' },
    { type: 'reasoning-delta', id: 'r1', delta: '' },
    { type: 'reasoning-end', id: 'r1' },
    { type: 'tool-input-start', toolCallId: 't1', toolName: 'search' },
    { type: 'tool-input-delta', toolCallId: 't1', inputTextDelta: '{}' },
    { type: 'tool-input-available', toolCallId: 't1', toolName: 'search', input: {} },
    {
      type: 'tool-input-error',
      toolCallId: 't1',
      toolName: 'search',
      input: null,
      errorText: 'invalid input',
    },
    { type: 'tool-approval-request', toolCallId: 't1', approvalId: 'a1' },
    {
      type: 'data-tool-approval-request',
      toolCallId: 't1',
      toolName: 'search',
      approvalId: 'a1',
      input: {},
    },
    { type: 'tool-output-available', toolCallId: 't1', output: null },
    { type: 'tool-output-error', toolCallId: 't1', errorText: 'failed' },
    { type: 'data-tool-execution-error', toolCallId: 't1', errorText: 'failed' },
    { type: 'tool-output-denied', toolCallId: 't1' },
    { type: 'data-tool-execution-denied', toolCallId: 't1' },
    { type: 'source-url', sourceId: 's1', url: 'https://example.test' },
    { type: 'source-document', sourceId: 's1', mediaType: 'text/plain', title: '' },
    { type: 'file', url: 'https://example.test/file', mediaType: 'text/plain' },
    { type: 'message-metadata', messageMetadata: { arbitrary: true } },
    { type: 'error', errorText: 'failed' },
    { type: 'abort', reason: 'cancelled' },
    { type: 'finish-step' },
    { type: 'finish' },
  ];
  for (const event of sseEvents) {
    assert(normalizeChatSseData(JSON.stringify(event)).length > 0);
    for (const key of Object.keys(event).filter(
      (key) =>
        key !== 'type' &&
        !(
          (event.type === 'start' && key === 'messageId') ||
          (event.type === 'abort' && key === 'reason')
        )
    )) {
      const missing = { ...event };
      delete missing[key];
      rejects(() => normalizeChatSseData(JSON.stringify(missing)));
    }
  }
  assert.deepEqual(normalizeChatSseData('{"type":"start"}'), ['{"type":"start"}']);
  assert.deepEqual(normalizeChatSseData('{"type":"abort"}'), ['{"type":"abort"}']);
  rejects(() => normalizeChatSseData('{"type":"start","messageId":1}'));
  rejects(() => normalizeChatSseData('{"type":"abort","reason":1}'));
  for (const payload of ['invalid', 'null', '[]', '{}', '{"type":1}', '{"type":""}'])
    rejects(() => normalizeChatSseData(payload));
  const future = '{"type":"future-event","value":1}';
  assert.deepEqual(normalizeChatSseData(future), [future]);
  const approval = normalizeChatSseData(JSON.stringify(sseEvents[13])).map(JSON.parse);
  assert.equal(approval[0].type, 'tool-approval-request');
  assert.deepEqual(approval[1].data.input, {});
  assert.equal(
    JSON.parse(normalizeChatSseData(JSON.stringify(sseEvents[16]))[0]).type,
    'tool-output-error'
  );
  assert.equal(
    JSON.parse(normalizeChatSseData(JSON.stringify(sseEvents[18]))[0]).type,
    'tool-output-denied'
  );
  const stream = (events) =>
    normalizeChatSseResponse(
      new Response(
        events
          .map((event) => `data: ${typeof event === 'string' ? event : JSON.stringify(event)}\n\n`)
          .join(''),
        { headers: { 'content-type': 'text/event-stream' } }
      )
    );
  assert.match(
    await stream([
      sseEvents[0],
      sseEvents[2],
      sseEvents[3],
      sseEvents[4],
      sseEvents[26],
      '[DONE]',
    ]).text(),
    /你好/
  );
  // 重连允许从中间帧开始；取消和业务错误保留，交由 SDK 处理终止状态。
  assert.match(await stream([sseEvents[3], sseEvents[4], '[DONE]']).text(), /text-delta/);
  assert.match(await stream([sseEvents[24], '[DONE]']).text(), /cancelled/);
  assert.match(await stream([sseEvents[23], '[DONE]']).text(), /failed/);
  await assert.rejects(
    stream([{ type: 'text-delta', id: 'p1' }]).text(),
    (error) => error.code === 16
  );
  await assert.rejects(stream(['invalid']).text(), (error) => error.code === 16);
  await assert.rejects(
    normalizeChatSseResponse(
      new Response('retry: invalid\n\n', { headers: { 'content-type': 'text/event-stream' } })
    ).text(),
    (error) => error.code === 16
  );

  console.log('API response envelope、领域 mapper 与 Chat SSE DTO 契约离线检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

// 顶层响应必须有明确类型；DTO 内的开放 JSON 仅允许下列已确认字段。
const openJsonFields = new Set([
  'Chat/apis/ChatApi.type.ts:UIMessagePartResponse.input',
  'Chat/apis/ChatApi.type.ts:UIMessagePartResponse.output',
  'Chat/apis/ChatApi.type.ts:UIMessageResponse.metadata',
  'Chat/apis/ChatApi.type.ts:ToolApiResponse.config_schema',
  'Chat/apis/ChatApi.type.ts:UpdateUserToolConfigApiRequest.config',
  'Chat/apis/ChatApi.type.ts:ModelProviderMappingResponse.support_runtime_options',
  'InlineComment/apis/InlineCommentApi.type.ts:InlineCommentAnchorRefApiResponse.anchorPayload',
  'InlineComment/apis/InlineCommentApi.type.ts:CreateInlineCommentApiRequest.anchorPayload',
  'Group/apis/GroupApi.type.ts:GroupApiResponse.groupMetaInfo',
  'Tag/apis/TagApi.type.ts:TagTreeApiResponse.tagMetaInfo',
]);
const configPath = join(root, 'tsconfig.app.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();
const broad = (type) => {
  if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return true;
  if (type.isUnion()) return type.types.some(broad);
  if (checker.isArrayType(type)) return broad(checker.getTypeArguments(type)[0]);
  const index = checker.getIndexTypeOfType(type, ts.IndexKind.String);
  if (index) return type.getProperties().length === 0 && broad(index);
  return (
    Boolean(type.flags & ts.TypeFlags.Object) &&
    type.getProperties().length === 0 &&
    type.getCallSignatures().length === 0
  );
};
let methodCount = 0;
const domains = new Set();
for (const source of program.getSourceFiles()) {
  const relative = source.fileName.split('/src/domains/')[1];
  if (!relative) continue;
  domains.add(relative.split('/')[0]);
  const visit = (node) => {
    if (ts.isPropertySignature(node) && node.type && broad(checker.getTypeAtLocation(node.type))) {
      const owner = node.parent.name?.text;
      assert(
        openJsonFields.has(`${relative}:${owner}.${node.name.getText(source)}`),
        `未登记的开放 JSON: ${relative}:${owner}.${node.name.getText(source)}`
      );
    }
    ts.forEachChild(node, visit);
  };
  if (relative.includes('/apis/') && relative.endsWith('Api.type.ts')) visit(source);
  const module = checker.getSymbolAtLocation(source);
  if (!module) continue;
  for (const symbol of checker.getExportsOfModule(module)) {
    const type = checker.getTypeOfSymbolAtLocation(symbol, source);
    for (const candidate of [
      type,
      ...type
        .getProperties()
        .map((property) => checker.getTypeOfSymbolAtLocation(property, source)),
    ]) {
      for (const signature of candidate.getCallSignatures()) {
        const result = checker.getReturnTypeOfSignature(signature);
        const payload = checker.getPromisedTypeOfPromise(result);
        if (!payload) continue;
        assert(
          !broad(payload),
          `宽泛 API 响应: ${relative} ${symbol.name}: ${checker.typeToString(payload)}`
        );
        methodCount++;
      }
    }
  }
}
assert(methodCount > 0);
console.log(`领域 API 静态检查通过：${domains.size} 个领域目录、${methodCount} 个异步方法`);
