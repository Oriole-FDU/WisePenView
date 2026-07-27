import type { ISkillService } from '../service/index.type';

const mockDetail = {
  resourceId: 'mock-skill',
  title: 'Mock Skill',
  skillName: 'mock_skill',
  description: '',
  version: 0,
  draftVersion: 1,
  status: 'DRAFT' as const,
  updatedAt: '',
  creatorId: 'mock-user',
  scopeType: 'PERSONAL' as const,
  fileCount: 1,
  isOwner: true,
  files: [
    {
      id: 'mock-skill-md',
      name: 'SKILL.md',
      path: '/',
      kind: 'file' as const,
      language: 'markdown',
      content: '# Mock Skill\n',
    },
  ],
};

export const SkillServicesMock: ISkillService = {
  getSkillSummaries: async () => [mockDetail],
  createSkill: async () => mockDetail.resourceId,
  forkSkill: async () => `mock-skill-copy-${Date.now()}`,
  getSkillDetail: async () => mockDetail,
  getSkillVersionFiles: async () => mockDetail,
  updateSkillInfo: async () => undefined,
  publishVersion: async () => undefined,
  loadAssetContent: async () => '# Mock Skill\n',
  loadAssetBlob: async () => new Blob(),
  deleteAssets: async () => undefined,
  uploadAssets: async (_resourceId, _draftVersion, assets, options) => {
    assets.forEach((asset, index) => {
      options?.onProgress?.({ clientId: asset.clientId ?? String(index), progress: 100 });
    });
    return assets.map((asset, index) => ({
      clientId: asset.clientId ?? String(index),
      name: asset.name,
      path: asset.path,
      assetId: `mock-asset-${index}-${asset.name}`,
      objectKey: `mock-skill/${asset.path}/${asset.name}`,
    }));
  },
  moveAssets: async (_resourceId, _draftVersion, assets) =>
    assets.map((asset, index) => ({
      previousAssetId: asset.assetId,
      assetId: `mock-moved-asset-${index}-${asset.name}`,
      objectKey: `mock-skill/${asset.path}/${asset.name}`,
    })),
};
