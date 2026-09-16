import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import type { ResourceItemApiResponse } from '../apis/ResourceApi.type';
import mockdata from './mockdata.json';
import { SEARCH_CORPUS } from './searchMockData';

const ownerActions: ResourceItemApiResponse['currentActions'] = [
  'DISCOVER',
  'VIEW',
  'LOAD',
  'EDIT',
  'INLINE_COMMENT',
  'DOWNLOAD_WATERMARK',
  'DOWNLOAD_ORIGINAL',
  'FORK',
  'COMMENT',
];
export const mockResources = new Map<string, ResourceItemApiResponse>(
  (structuredClone(mockdata) as ResourceItemApiResponse[]).map((item) => [item.resourceId, item])
);
export function addMockResource(
  resourceName: string,
  resourceType: string,
  pathTagId = 'tag-root',
  resourceId = `mock-resource-${crypto.randomUUID()}`
): string {
  mockResources.set(resourceId, {
    resourceId,
    resourceName,
    resourceType,
    ownerId: '1',
    ownerInfo: { nickname: '示例用户', identityType: 1 },
    currentActions: ownerActions,
    resourceAccessRole: 'OWNER',
    tagBinds: [{ primaryTagId: pathTagId, tags: { [pathTagId]: { tagName: pathTagId } } }],
  });
  return resourceId;
}
export function getMockResource(resourceId: string): ResourceItemApiResponse {
  const item = mockResources.get(resourceId);
  if (!item)
    throw createClientError(FRONTEND_CLIENT_ERROR.RESOURCE_PERMISSION_CONTEXT_MISSING, {
      resourceId,
    });
  return item;
}

// 保留列表压力预览样本，所有查询仍由同一 API 提供。
for (let n = 1; n <= 120; n++) {
  addMockResource(
    `压力测试文档 ${n}.pdf`,
    'pdf',
    'tag-root',
    `mock-stress-${String(n).padStart(4, '0')}`
  );
}
addMockResource('Mock Skill', 'SKILL', 'tag-root', 'mock-skill');
addMockResource('研究助手', 'AGENT', 'tag-root', 'mock-agent');

for (const item of SEARCH_CORPUS) {
  addMockResource(item.resourceName, item.resourceType, 'tag-root', item.resourceId);
}
