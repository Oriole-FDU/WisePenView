import { createMockResourcePermissionOverview } from '@/domains/Resource/mock/resourcePermissionOverview.mockdata';

import type { AgentDetail } from '../entity/agent';
import { AgentServicesMap } from '../mapper/AgentServices.map';
import type { IAgentService } from '../service/index.type';

const mockAgent: AgentDetail = {
  resourceId: 'mock-agent',
  resourceInfo: {
    resourceId: 'mock-agent',
    resourceName: '研究助手',
    resourceType: 'agent',
    ownerId: '1',
    ownerInfo: {},
  },
  title: '研究助手',
  name: '',
  description: '',
  publishedVersion: 0,
  draftVersion: 1,
  version: 1,
  status: 'DRAFT',
  spec: AgentServicesMap.mapSpec(),
  assets: [],
};

export const AgentServicesMock: IAgentService = {
  getAgentPermissionOverview: async (resourceId) =>
    createMockResourcePermissionOverview({ resourceId, resourceType: 'agent' }),
  async createAgent() {
    return mockAgent.resourceId;
  },
  async getAgentDetail(resourceId) {
    const agent = structuredClone(mockAgent);
    return {
      ...agent,
      resourceId,
      resourceInfo: agent.resourceInfo ? { ...agent.resourceInfo, resourceId } : undefined,
    };
  },
  async saveAgentDraft({ name, description, spec }) {
    mockAgent.name = name ?? '';
    mockAgent.description = description ?? '';
    mockAgent.spec = structuredClone(spec);
  },
  async publishVersion() {
    mockAgent.publishedVersion += 1;
    mockAgent.draftVersion += 1;
  },
  async uploadAsset() {},
  async deleteAssets() {},
};
