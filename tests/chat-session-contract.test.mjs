import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'chat-session-contract-'));

try {
  const outfile = join(tempDir, 'chat-session-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export {
          CancelChatTurnApiContract,
          CreateSessionApiContract,
          DeleteSessionApiContract,
          GetActiveChatTurnApiContract,
          InitTemporaryAttachmentUploadApiContract,
          ListHistoryMessagesApiContract,
          ListSessionsApiContract,
          RenameSessionApiContract,
          SetSessionAgentApiContract,
        } from '@/domains/Chat/apis/ChatSessionApi.contract';
        export { ChatServicesMap } from '@/domains/Chat/mapper/ChatServices.map';
        export { ChatApi, ChatSessionApi } from '@/domains/Chat/mock/ChatApi.mock';
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
    CancelChatTurnApiContract,
    ChatApi,
    ChatServicesMap,
    ChatSessionApi,
    CreateSessionApiContract,
    DeleteSessionApiContract,
    GetActiveChatTurnApiContract,
    InitTemporaryAttachmentUploadApiContract,
    ListHistoryMessagesApiContract,
    ListSessionsApiContract,
    parseApiRequest,
    parseApiResponse,
    RenameSessionApiContract,
    SetSessionAgentApiContract,
  } = await import(pathToFileURL(outfile).href);

  assert.equal(
    new Set(
      [
        CancelChatTurnApiContract,
        CreateSessionApiContract,
        DeleteSessionApiContract,
        GetActiveChatTurnApiContract,
        InitTemporaryAttachmentUploadApiContract,
        ListHistoryMessagesApiContract,
        ListSessionsApiContract,
        RenameSessionApiContract,
        SetSessionAgentApiContract,
      ].map((contract) => contract.endpoint)
    ).size,
    9
  );
  assert.deepEqual(SetSessionAgentApiContract.queryKeys, ['session_id']);
  assert.deepEqual(RenameSessionApiContract.queryKeys, ['session_id']);

  const mappedCreateRequest = ChatServicesMap.mapCreateSessionRequest({
    title: '新会话',
    agentId: 'agent-1',
    agentVersion: 99,
  });
  const createRequest = parseApiRequest(CreateSessionApiContract, mappedCreateRequest);
  assert.equal(createRequest.agent_id, 'agent-1');
  assert.equal('agent_version' in createRequest, false);
  assert(
    !CreateSessionApiContract.request.safeParse({
      agent_id: 'agent-1',
      agent_version: 1,
    }).success
  );

  const session = parseApiResponse(
    CreateSessionApiContract,
    await ChatSessionApi.createSession(createRequest)
  );
  assert.equal(session.agent_id, 'agent-1');
  assert.equal(session.agent_version, 1);

  const sessions = parseApiResponse(
    ListSessionsApiContract,
    await ChatSessionApi.listSessions({ page: 1, size: 20 })
  );
  assert.equal(sessions.list.length > 0, true);

  const history = parseApiResponse(
    ListHistoryMessagesApiContract,
    await ChatSessionApi.listHistoryMessages({
      session_id: 'mock-session-1',
      page: 1,
      size: 20,
    })
  );
  assert.equal(history.list[0].role, 'user');
  assert.equal(history.list[0].parts[0].type, 'text');

  const attachment = parseApiResponse(
    InitTemporaryAttachmentUploadApiContract,
    await ChatApi.initTemporaryAttachmentUpload({
      session_id: session.id,
      filename: 'report.pdf',
      extension: 'pdf',
      file_size: 1024,
      md5: '0123456789abcdef0123456789abcdef',
    })
  );
  assert.equal(attachment.flash_uploaded, true);

  console.log('Chat Session API 契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
