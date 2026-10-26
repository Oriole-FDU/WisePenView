import { apiPostUnchecked } from '@/apis/request';
import type {
  CancelUploadAssetsApiRequest,
  InitUploadAssetsApiResponse,
} from '@/domains/_shared/apis/versionAssetApi.type';

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
  apiPostUnchecked('/agent/createAgent', body);

const getAgentInfo = (resourceId: string): Promise<AgentInfoApiResponse | undefined> =>
  apiPostUnchecked('/agent/getAgentInfo', null, { params: { resourceId } });

const getAgentVersionBundleInfo = (
  resourceId: string,
  version: number
): Promise<AgentVersionBundleApiResponse | undefined> =>
  apiPostUnchecked('/agent/getAgentVersionBundleInfo', null, { params: { resourceId, version } });

const changeAgentInfo = (body: UpdateAgentInfoApiRequest): Promise<void> =>
  apiPostUnchecked('/agent/changeAgentInfo', body);

const updateAgentSpec = (body: UpdateAgentSpecApiRequest): Promise<void> =>
  apiPostUnchecked('/agent/updateAgentSpec', body);

const publishAgentVersion = (resourceId: string): Promise<void> =>
  apiPostUnchecked('/agent/publishAgentVersion', { resourceId });

const initUploadAgentAssets = (
  body: InitUploadAgentAssetsApiRequest
): Promise<InitUploadAssetsApiResponse | undefined> =>
  apiPostUnchecked('/agent/initUploadAgentAssets', body);

const deleteAgentAssets = (body: DeleteAgentAssetsApiRequest): Promise<void> =>
  apiPostUnchecked('/agent/deleteAgentAssets', body);

const cancelUploadAgentAssets = (body: CancelUploadAssetsApiRequest): Promise<void> =>
  apiPostUnchecked('/agent/cancelUploadAgentAssets', body);

export const AgentApi = {
  createAgent,
  getAgentInfo,
  getAgentVersionBundleInfo,
  changeAgentInfo,
  updateAgentSpec,
  publishAgentVersion,
  initUploadAgentAssets,
  cancelUploadAgentAssets,
  deleteAgentAssets,
};
