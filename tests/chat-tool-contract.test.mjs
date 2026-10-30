import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'chat-tool-contract-'));

try {
  const outfile = join(tempDir, 'chat-tool-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export {
          DeleteUserToolConfigApiContract,
          ListToolsApiContract,
          UpdateUserToolConfigApiContract,
        } from '@/domains/Chat/apis/ChatToolApi.contract';
        export { ChatServicesMap } from '@/domains/Chat/mapper/ChatServices.map';
        export { ChatApi } from '@/domains/Chat/mock/ChatApi.mock';
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
    ChatApi,
    ChatServicesMap,
    DeleteUserToolConfigApiContract,
    ListToolsApiContract,
    parseApiRequest,
    parseApiResponse,
    UpdateUserToolConfigApiContract,
  } = await import(pathToFileURL(outfile).href);

  const tools = parseApiResponse(ListToolsApiContract, await ChatApi.listTools());
  assert.equal(tools.tools.length > 0, true);
  assert.equal(tools.tools[0].selection_mode, 'user_selectable');
  const mapped = ChatServicesMap.mapGetToolsFromApi(tools);
  assert.equal(mapped[0].toolId, 'default_web_search');

  const updateRequest = parseApiRequest(UpdateUserToolConfigApiContract, {
    tool_name: 'default_web_search',
    enabled: false,
    config: { max_results: 5 },
    secret_config: { api_key: 'secret' },
  });
  const updated = parseApiResponse(
    UpdateUserToolConfigApiContract,
    await ChatApi.updateUserToolConfig(updateRequest)
  );
  assert.equal(updated.enabled, false);

  assert(
    !UpdateUserToolConfigApiContract.request.safeParse({
      tool_name: 'default_web_search',
      config: [],
    }).success
  );
  assert.equal(DeleteUserToolConfigApiContract.requestPlacement, 'body');

  console.log('Chat Tool API 契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
