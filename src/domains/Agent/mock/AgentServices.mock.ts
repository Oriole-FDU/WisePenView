import type { AgentDetail } from '../entity/agent';
import { AgentServicesMap } from '../mapper/AgentServices.map';
import type { IAgentService } from '../service/index.type';

const mockAgent: AgentDetail = {
  resourceId: 'mock-agent',
  title: '研究助手',
  name: '',
  description: '',
  publishedVersion: 0,
  draftVersion: 1,
  version: 1,
  status: 'DRAFT',
  spec: AgentServicesMap.mapSpec(),
  assets: [],
  isOwner: true,
};

export const AgentServicesMock: IAgentService = {
  async createAgent() {
    return mockAgent.resourceId;
  },
  async getAgentDetail(resourceId) {
    return { ...structuredClone(mockAgent), resourceId };
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
