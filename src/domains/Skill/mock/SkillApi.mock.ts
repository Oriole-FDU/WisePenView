import { mockObjects } from '@/domains/_shared/mock/ossClient.mock';
import { mockResponse } from '@/domains/_shared/mock/response';
import {
  assertMockVersionUploadsComplete,
  cancelMockVersionUploads,
  deleteMockVersionAssets,
  initMockVersionAssets,
} from '@/domains/_shared/mock/versionAssets.mock';
import { addMockResource, getMockResource } from '@/domains/Resource/mock/resourceStore';

import type { SkillApi as SkillApiContract } from '../apis/SkillApi';
import type { SkillInfoApiResponse, SkillVersionBundleApiResponse } from '../apis/SkillApi.schema';

const infos = new Map<string, SkillInfoApiResponse['skillInfo']>();
const bundles = new Map<string, SkillVersionBundleApiResponse>();
const info = (id: string) => {
  getMockResource(id);
  let result = infos.get(id);
  if (!result) {
    result = {
      resourceId: id,
      name: 'mock_skill',
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
    const objectKey = `mock-skill/${id}/${version}/SKILL.md`;
    mockObjects.set(objectKey, new Blob(['# Mock Skill\n']));
    result = {
      resourceId: id,
      version,
      status: version <= (info(id).version ?? 0) ? 'PUBLISHED' : 'DRAFT',
      assets: [
        {
          id: `${key}:skill-md`,
          name: 'SKILL.md',
          path: '/',
          objectKey,
          assetResourceType: 'MD',
          uploadStatus: 'AVAILABLE',
          size: '14',
          pendingUpload: null,
        },
      ],
    };
    bundles.set(key, result);
  }
  return result;
};
export const SkillApi: typeof SkillApiContract = {
  createSkill: async ({ title, name, description, mountTargetTagId }) => {
    const id = addMockResource(title, 'SKILL', mountTargetTagId);
    infos.set(id, {
      resourceId: id,
      name: name ?? 'mock_skill',
      description: description ?? '',
      version: 0,
      sourceType: 'MANUAL',
      updateTime: Date.now(),
    });
    return id;
  },
  forkSkill: async ({ resourceId, forkedResourceName }) => {
    const id = addMockResource(forkedResourceName, 'SKILL');
    infos.set(id, structuredClone(info(resourceId)));
    return id;
  },
  getSkillInfo: ({ resourceId }) =>
    mockResponse({ resourceInfo: getMockResource(resourceId), skillInfo: info(resourceId) }),
  getSkillVersionBundleInfo: ({ resourceId, version }) => mockResponse(bundle(resourceId, version)),
  getSkillAssetStsToken: async () => ({
    accessKeyId: 'mock',
    accessKeySecret: 'mock',
    securityToken: 'mock',
    bucket: 'mock',
    region: 'mock',
    expiration: Date.parse('2099-01-01T00:00:00Z'),
  }),
  changeSkillInfo: async ({ resourceId, name, description }) => {
    if (resourceId) Object.assign(info(resourceId), { name, description });
    return null;
  },
  initUploadSkillAssets: async ({ resourceId, draftVersion, assets }) => {
    const target = bundle(resourceId, draftVersion);
    return {
      resourceId,
      version: draftVersion,
      assetUploadTickets: initMockVersionAssets(target, assets, `mock-skill/${resourceId}`),
    };
  },
  cancelUploadSkillAssets: async ({ resourceId, draftVersion, uploads }) => {
    cancelMockVersionUploads(bundle(resourceId, draftVersion), uploads);
    return null;
  },
  deleteSkillAssets: async ({ resourceId, draftVersion, assetIds }) => {
    const target = bundle(resourceId, draftVersion);
    deleteMockVersionAssets(target, assetIds);
    return null;
  },
  publishSkillVersion: async ({ resourceId }) => {
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
};
