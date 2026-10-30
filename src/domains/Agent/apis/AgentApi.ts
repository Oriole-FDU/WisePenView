import { executeApiContract } from '@/apis/executeApiContract';

import {
  CancelUploadAgentAssetsApiContract,
  type CancelUploadAgentAssetsApiContractRequest,
  ChangeAgentInfoApiContract,
  type ChangeAgentInfoApiContractRequest,
  CreateAgentApiContract,
  type CreateAgentApiContractRequest,
  type CreateAgentApiContractResponse,
  DeleteAgentAssetsApiContract,
  type DeleteAgentAssetsApiContractRequest,
  GetAgentInfoApiContract,
  type GetAgentInfoApiContractRequest,
  type GetAgentInfoApiContractResponse,
  GetAgentVersionBundleInfoApiContract,
  type GetAgentVersionBundleInfoApiContractResponse,
  InitUploadAgentAssetsApiContract,
  type InitUploadAgentAssetsApiContractRequest,
  type InitUploadAgentAssetsApiContractResponse,
  PublishAgentVersionApiContract,
  type PublishAgentVersionApiContractRequest,
  UpdateAgentSpecApiContract,
  type UpdateAgentSpecApiContractRequest,
} from './AgentApi.contract';

const createAgent = (
  body: CreateAgentApiContractRequest
): Promise<CreateAgentApiContractResponse> => executeApiContract(CreateAgentApiContract, body);

const getAgentInfo = (
  req: GetAgentInfoApiContractRequest
): Promise<GetAgentInfoApiContractResponse> => executeApiContract(GetAgentInfoApiContract, req);

const getAgentVersionBundleInfo = (
  resourceId: string,
  version: number
): Promise<GetAgentVersionBundleInfoApiContractResponse> =>
  executeApiContract(GetAgentVersionBundleInfoApiContract, { resourceId, version });

const changeAgentInfo = (body: ChangeAgentInfoApiContractRequest): Promise<null> =>
  executeApiContract(ChangeAgentInfoApiContract, body);

const updateAgentSpec = (body: UpdateAgentSpecApiContractRequest): Promise<null> =>
  executeApiContract(UpdateAgentSpecApiContract, body);

const publishAgentVersion = (body: PublishAgentVersionApiContractRequest): Promise<null> =>
  executeApiContract(PublishAgentVersionApiContract, body);

const initUploadAgentAssets = (
  body: InitUploadAgentAssetsApiContractRequest
): Promise<InitUploadAgentAssetsApiContractResponse> =>
  executeApiContract(InitUploadAgentAssetsApiContract, body);

const deleteAgentAssets = (body: DeleteAgentAssetsApiContractRequest): Promise<null> =>
  executeApiContract(DeleteAgentAssetsApiContract, body);

const cancelUploadAgentAssets = (body: CancelUploadAgentAssetsApiContractRequest): Promise<null> =>
  executeApiContract(CancelUploadAgentAssetsApiContract, body);

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
