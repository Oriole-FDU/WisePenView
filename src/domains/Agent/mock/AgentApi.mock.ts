import { mockResponse } from '@/domains/_shared/mock/response';
import {
  assertMockVersionUploadsComplete,
  cancelMockVersionUploads,
  deleteMockVersionAssets,
  initMockVersionAssets,
} from '@/domains/_shared/mock/versionAssets.mock';
import { addMockResource, getMockResource } from '@/domains/Resource/mock/resourceStore';

import type { AgentApi as AgentApiContract } from '../apis/AgentApi';
import type { AgentInfoApiResponse, AgentVersionBundleApiResponse } from '../apis/AgentApi.schema';

const infos = new Map<string, AgentInfoApiResponse['agentInfo']>();
const bundles = new Map<string, AgentVersionBundleApiResponse>();
const info = (id: string) => {
  getMockResource(id);
  let result = infos.get(id);
  if (!result) {
    result = {
      resourceId: id,
      name: '',
      description: '',
      version: 0,
      sourceType: 'MANUAL',
      updateTime: Date.parse('2026-03-01T00:00:00Z'),
    };
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
      spec: null,
      assets: [],
    };
    bundles.set(key, result);
  }
  return result;
};
export const AgentApi: typeof AgentApiContract = {
  createAgent: async ({ title, name, description, mountTargetTagId }) => {
    const id = addMockResource(title, 'AGENT', mountTargetTagId);
    infos.set(id, {
      resourceId: id,
      name: name ?? '',
      description: description ?? '',
      version: 0,
      sourceType: 'MANUAL',
      updateTime: Date.now(),
    });
    return id;
  },
  getAgentInfo: ({ resourceId }) =>
    mockResponse({ resourceInfo: getMockResource(resourceId), agentInfo: info(resourceId) }),
  getAgentVersionBundleInfo: (resourceId, version) => mockResponse(bundle(resourceId, version)),
  changeAgentInfo: async ({ resourceId, name, description }) => {
    Object.assign(info(resourceId), { name, description });
    return null;
  },
  updateAgentSpec: async ({ resourceId, draftVersion, spec }) => {
    bundle(resourceId, draftVersion).spec = structuredClone(spec);
    return null;
  },
  publishAgentVersion: async ({ resourceId }) => {
    const data = info(resourceId);
    const version = (data.version ?? 0) + 1;
    const published = bundle(resourceId, version);
    assertMockVersionUploadsComplete(published);
    published.status = 'PUBLISHED';
    data.version = version;
    bundles.set(`${resourceId}:${version + 1}`, {
      ...structuredClone(published),
      version: version + 1,
      status: 'DRAFT',
    });
    return null;
  },
  initUploadAgentAssets: async ({ resourceId, draftVersion, assets }) => {
    const target = bundle(resourceId, draftVersion);
    return {
      resourceId,
      version: draftVersion,
      assetUploadTickets: initMockVersionAssets(target, assets, `mock-agent/${resourceId}`),
    };
  },
  cancelUploadAgentAssets: async ({ resourceId, draftVersion, uploads }) => {
    cancelMockVersionUploads(bundle(resourceId, draftVersion), uploads);
    return null;
  },
  deleteAgentAssets: async ({ resourceId, draftVersion, assetIds }) => {
    const target = bundle(resourceId, draftVersion);
    deleteMockVersionAssets(target, assetIds);
    return null;
  },
};
