import { apiPost } from '@/apis/request';
import type { InitUploadAssetsApiResponse } from '@/domains/_shared/apis/versionAssetApi.type';

import type {
  AgentInfoApiResponse,
  AgentVersionBundleApiResponse,
  CreateAgentApiRequest,
  DeleteAgentAssetsApiRequest,
  InitUploadAgentAssetsApiRequest,
  UpdateAgentInfoApiRequest,
  UpdateAgentSpecApiRequest,
} from './AgentApi.type';

const createAgent = (body: CreateAgentApiRequest): Promise<string | undefined> =>
  apiPost('/agent/createAgent', body);

const getAgentInfo = (resourceId: string): Promise<AgentInfoApiResponse | undefined> =>
  apiPost('/agent/getAgentInfo', null, { params: { resourceId } });

const getAgentVersionBundleInfo = (
  resourceId: string,
  version: number
): Promise<AgentVersionBundleApiResponse | undefined> =>
  apiPost('/agent/getAgentVersionBundleInfo', null, { params: { resourceId, version } });

const changeAgentInfo = (body: UpdateAgentInfoApiRequest): Promise<void> =>
  apiPost('/agent/changeAgentInfo', body);

const updateAgentSpec = (body: UpdateAgentSpecApiRequest): Promise<void> =>
  apiPost('/agent/updateAgentSpec', body);

const publishAgentVersion = (resourceId: string): Promise<void> =>
  apiPost('/agent/publishAgentVersion', { resourceId });

const initUploadAgentAssets = (
  body: InitUploadAgentAssetsApiRequest
): Promise<InitUploadAssetsApiResponse | undefined> =>
  apiPost('/agent/initUploadAgentAssets', body);

const deleteAgentAssets = (body: DeleteAgentAssetsApiRequest): Promise<void> =>
  apiPost('/agent/deleteAgentAssets', body);

export const AgentApi = {
  createAgent,
  getAgentInfo,
  getAgentVersionBundleInfo,
  changeAgentInfo,
  updateAgentSpec,
  publishAgentVersion,
  initUploadAgentAssets,
  deleteAgentAssets,
};
