import { addMockResource, getMockResource } from '@/domains/Resource/mock/resourceStore';
import type { VersionResourceInfoApiResponse } from '@/domains/_shared/apis/versionAssetApi.type';
import { mockObjects } from '@/domains/_shared/mock/ossClient.mock';
import { mockResponse } from '@/domains/_shared/mock/response';
import type { SkillApi as SkillApiContract } from '../apis/SkillApi';
import type { SkillVersionBundleApiResponse } from '../apis/SkillApi.type';

const infos = new Map<string, VersionResourceInfoApiResponse>();
const bundles = new Map<string, SkillVersionBundleApiResponse>();
const info = (id: string) => {
  getMockResource(id);
  let result = infos.get(id);
  if (!result) {
    result = { name: 'mock_skill', description: '', version: 0 };
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
    infos.set(id, { name, description, version: 0 });
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
    expiration: '2099-01-01T00:00:00Z',
  }),
  changeSkillInfo: async ({ resourceId, name, description }) => {
    if (resourceId) Object.assign(info(resourceId), { name, description });
  },
  initUploadSkillAssets: async ({ resourceId, draftVersion, assets }) => {
    const target = bundle(resourceId, draftVersion);
    return {
      resourceId,
      version: draftVersion,
      assetUploadTickets: assets.map((asset) => {
        const assetId = `mock-asset-${crypto.randomUUID()}`;
        const objectKey = `mock-skill/${resourceId}/${assetId}`;
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
  deleteSkillAssets: async ({ resourceId, draftVersion, assetIds }) => {
    const target = bundle(resourceId, draftVersion);
    target.assets = target.assets?.filter((asset) => !assetIds.includes(asset.id ?? ''));
  },
  publishSkillVersion: async ({ resourceId }) => {
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
};
