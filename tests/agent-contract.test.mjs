import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'agent-contract-'));

try {
  const outfile = join(tempDir, 'agent-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export {
          CancelUploadAgentAssetsApiContract,
          ChangeAgentInfoApiContract,
          CreateAgentApiContract,
          DeleteAgentAssetsApiContract,
          GetAgentInfoApiContract,
          GetAgentVersionBundleInfoApiContract,
          InitUploadAgentAssetsApiContract,
          PublishAgentVersionApiContract,
          UpdateAgentSpecApiContract,
        } from '@/domains/Agent/apis/AgentApi.contract';
        export { AgentApi } from '@/domains/Agent/mock/AgentApi.mock';
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
    AgentApi,
    CancelUploadAgentAssetsApiContract,
    ChangeAgentInfoApiContract,
    CreateAgentApiContract,
    DeleteAgentAssetsApiContract,
    GetAgentInfoApiContract,
    GetAgentVersionBundleInfoApiContract,
    InitUploadAgentAssetsApiContract,
    parseApiRequest,
    parseApiResponse,
    PublishAgentVersionApiContract,
    UpdateAgentSpecApiContract,
  } = await import(pathToFileURL(outfile).href);

  for (const contract of [
    CancelUploadAgentAssetsApiContract,
    ChangeAgentInfoApiContract,
    CreateAgentApiContract,
    DeleteAgentAssetsApiContract,
    InitUploadAgentAssetsApiContract,
    PublishAgentVersionApiContract,
    UpdateAgentSpecApiContract,
  ]) {
    assert.equal(contract.method, 'POST');
    assert.equal(contract.requestPlacement, 'body');
  }
  for (const contract of [GetAgentInfoApiContract, GetAgentVersionBundleInfoApiContract]) {
    assert.equal(contract.method, 'POST');
    assert.equal(contract.requestPlacement, 'query');
  }

  const info = parseApiResponse(
    GetAgentInfoApiContract,
    await AgentApi.getAgentInfo({ resourceId: 'mock-agent' })
  );
  assert.equal(info.resourceInfo.resourceType, 'AGENT');
  assert.equal(info.agentInfo.sourceType, 'MANUAL');

  const bundle = parseApiResponse(
    GetAgentVersionBundleInfoApiContract,
    await AgentApi.getAgentVersionBundleInfo('mock-agent', 1)
  );
  assert.equal(bundle.version, 1);
  assert.equal(bundle.spec, null);
  assert.deepEqual(bundle.assets, []);

  const spec = {
    systemPrompt: '你是研究助手',
    autoGenerateTitle: true,
    modelPolicy: {
      defaultModelId: null,
      defaultProviderId: null,
      allowRequestOverride: true,
    },
    toolAndSkillPolicy: {
      enableUseTool: true,
      toolSelectionDefaultEnabled: true,
      toolSelectionOverrides: {},
      enableUseSkill: true,
      onDemandSkillIds: [],
      skillMatchTopK: 8,
    },
    memoryPolicy: {
      enableChatMemory: true,
      enablePersistenceChatMemory: false,
      enableChatMemorySummary: true,
      highWatermarkRatio: 0.8,
      lowWatermarkRatio: 0.5,
      summaryPrompt: '',
      enableLongTermMemory: false,
      longTermMemoryLimit: 10,
      longTermMemoryScoreThreshold: 0.6,
    },
  };
  const updateRequest = parseApiRequest(UpdateAgentSpecApiContract, {
    resourceId: 'mock-agent',
    draftVersion: 1,
    spec,
  });
  assert.equal(updateRequest.spec.toolAndSkillPolicy?.skillMatchTopK, 8);
  assert(
    !UpdateAgentSpecApiContract.request.safeParse({
      resourceId: 'mock-agent',
      draftVersion: 1,
      spec: { ...spec, unknownField: true },
    }).success
  );

  console.log('Agent API 契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
