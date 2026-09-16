import { addMockResource, getMockResource } from '@/domains/Resource/mock/resourceStore';
import type { VersionResourceInfoApiResponse } from '@/domains/_shared/apis/versionAssetApi.type';
import { mockResponse } from '@/domains/_shared/mock/response';
import type { AgentApi as AgentApiContract } from '../apis/AgentApi';
import type { AgentVersionBundleApiResponse } from '../apis/AgentApi.type';

const infos = new Map<string, VersionResourceInfoApiResponse>();
const bundles = new Map<string, AgentVersionBundleApiResponse>();
const info = (id: string) => {
  getMockResource(id);
  let result = infos.get(id);
  if (!result) {
    result = { name: '', description: '', version: 0 };
    infos.set(id, result);
  }
  return result;
};
const bundle = (id: string, version: number) => {
  const key = `${id}:${version}`;
  let result = bundles.get(key);
  if (!result) {
    result = {
      resourceId: id,
      version,
      status: version <= (info(id).version ?? 0) ? 'PUBLISHED' : 'DRAFT',
      spec: {},
      assets: [],
    };
    bundles.set(key, result);
  }
  return result;
};
export const AgentApi: typeof AgentApiContract = {
  createAgent: async ({ title, name, description, mountTargetTagId }) => {
    const id = addMockResource(title, 'AGENT', mountTargetTagId);
    infos.set(id, { name, description, version: 0 });
    return id;
  },
  getAgentInfo: (resourceId) =>
    mockResponse({ resourceInfo: getMockResource(resourceId), agentInfo: info(resourceId) }),
  getAgentVersionBundleInfo: (resourceId, version) => mockResponse(bundle(resourceId, version)),
  changeAgentInfo: async ({ resourceId, name, description }) => {
    Object.assign(info(resourceId), { name, description });
  },
  updateAgentSpec: async ({ resourceId, draftVersion, spec }) => {
    bundle(resourceId, draftVersion).spec = structuredClone(spec);
  },
  publishAgentVersion: async (resourceId) => {
    const data = info(resourceId);
    const version = (data.version ?? 0) + 1;
    const published = bundle(resourceId, version);
    published.status = 'PUBLISHED';
    data.version = version;
    bundles.set(`${resourceId}:${version + 1}`, {
      ...structuredClone(published),
      version: version + 1,
      status: 'DRAFT',
    });
  },
  initUploadAgentAssets: async ({ resourceId, draftVersion, assets }) => {
    const target = bundle(resourceId, draftVersion);
    return {
      resourceId,
      version: draftVersion,
      assetUploadTickets: assets.map((asset) => {
        const assetId = `mock-asset-${crypto.randomUUID()}`;
        const objectKey = `mock-agent/${resourceId}/${assetId}`;
        (target.assets ??= []).push({
          ...asset,
          id: assetId,
          objectKey,
          size: asset.expectedSize,
          uploadStatus: 'AVAILABLE',
        });
        return { assetId, objectKey, putUrl: objectKey, callbackHeader: 'mock' };
      }),
    };
  },
  deleteAgentAssets: async ({ resourceId, draftVersion, assetIds }) => {
    const target = bundle(resourceId, draftVersion);
    target.assets = target.assets?.filter((asset) => !assetIds.includes(asset.id ?? ''));
  },
};
