import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'chat-model-contract-'));

try {
  const outfile = join(tempDir, 'chat-model-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export {
          BindModelProviderApiContract,
          CreateUserModelApiContract,
          CreateUserProviderApiContract,
          DeleteUserModelApiContract,
          DeleteUserProviderApiContract,
          ListAvailableModelsApiContract,
          ListModelsApiContract,
          ListUserProvidersApiContract,
          UnbindModelProviderApiContract,
          UpdateUserModelApiContract,
          UpdateUserProviderApiContract,
        } from '@/domains/ChatConfig/apis/ChatModelApi.contract';
        export { ChatConfigServicesMap } from '@/domains/ChatConfig/mapper/ChatConfigServices.map';
        export { ChatConfigApi } from '@/domains/ChatConfig/mock/ChatConfigApi.mock';
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
    BindModelProviderApiContract,
    ChatConfigApi,
    ChatConfigServicesMap,
    CreateUserModelApiContract,
    CreateUserProviderApiContract,
    DeleteUserModelApiContract,
    DeleteUserProviderApiContract,
    ListAvailableModelsApiContract,
    ListModelsApiContract,
    ListUserProvidersApiContract,
    parseApiRequest,
    parseApiResponse,
    UnbindModelProviderApiContract,
    UpdateUserModelApiContract,
    UpdateUserProviderApiContract,
  } = await import(pathToFileURL(outfile).href);

  assert.equal(
    new Set(
      [
        BindModelProviderApiContract,
        CreateUserModelApiContract,
        CreateUserProviderApiContract,
        DeleteUserModelApiContract,
        DeleteUserProviderApiContract,
        ListAvailableModelsApiContract,
        ListModelsApiContract,
        ListUserProvidersApiContract,
        UnbindModelProviderApiContract,
        UpdateUserModelApiContract,
        UpdateUserProviderApiContract,
      ].map((contract) => contract.endpoint)
    ).size,
    11
  );

  const available = parseApiResponse(
    ListAvailableModelsApiContract,
    await ChatConfigApi.listAvailableModels()
  );
  assert.equal(available.system_models[0].id.length, 24);
  assert.equal(available.system_models[0].mappings?.[0].support_runtime_options != null, true);
  const mappedModels = ChatConfigServicesMap.mapGetModelsFromApi(available);
  assert.equal(mappedModels.length > 0, true);

  const userModels = parseApiResponse(
    ListModelsApiContract,
    await ChatConfigApi.listModels({ model_scope: 'USER' })
  );
  assert.equal(
    userModels.models.every((model) => model.scope === 'USER'),
    true
  );

  const providerRequest = parseApiRequest(CreateUserProviderApiContract, {
    name: 'OpenAI',
    type: 'OPENAI',
    api_key: 'secret',
    base_url: 'https://api.example.com',
  });
  await ChatConfigApi.createUserProvider(providerRequest);
  const providers = parseApiResponse(
    ListUserProvidersApiContract,
    await ChatConfigApi.listUserProviders()
  );
  assert.equal(typeof providers.providers[0].input_tokens, 'number');
  assert.equal('token_usage' in providers.providers[0], false);

  assert(
    !CreateUserProviderApiContract.request.safeParse({
      ...providerRequest,
      base_url: 'javascript:alert(1)',
    }).success
  );

  const modelRequest = parseApiRequest(CreateUserModelApiContract, {
    display_name: '自定义模型',
    model_family: 'GENERIC',
    support_tools: true,
  });
  await ChatConfigApi.createUserModel(modelRequest);

  const bindRequest = parseApiRequest(BindModelProviderApiContract, {
    model_id: available.user_models[0].id,
    provider_id: providers.providers[0].id,
    provider_model_name: 'custom-model',
  });
  assert.equal(bindRequest.provider_model_name, 'custom-model');

  console.log('Chat Model API 契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
