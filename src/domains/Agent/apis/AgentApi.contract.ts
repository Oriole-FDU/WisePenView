import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiResponseSchema } from '@/apis/schema';

import {
  AgentInfoApiResponseSchema,
  AgentResourceIdApiResponseSchema,
  AgentVersionBundleApiResponseSchema,
  CancelUploadAgentAssetsApiRequestSchema,
  CreateAgentApiRequestSchema,
  DeleteAgentAssetsApiRequestSchema,
  GetAgentInfoApiRequestSchema,
  GetAgentVersionBundleInfoApiRequestSchema,
  InitUploadAgentAssetsApiRequestSchema,
  InitUploadAgentAssetsApiResponseSchema,
  PublishAgentVersionApiRequestSchema,
  UpdateAgentInfoApiRequestSchema,
  UpdateAgentSpecApiRequestSchema,
} from './AgentApi.schema';

export const CreateAgentApiContract = defineApiContract({
  name: 'CreateAgentApi',
  method: 'POST',
  endpoint: '/agent/createAgent',
  requestPlacement: 'body',
  transport: 'json',
  request: CreateAgentApiRequestSchema,
  response: AgentResourceIdApiResponseSchema,
});

export const GetAgentInfoApiContract = defineApiContract({
  name: 'GetAgentInfoApi',
  method: 'POST',
  endpoint: '/agent/getAgentInfo',
  requestPlacement: 'query',
  transport: 'json',
  request: GetAgentInfoApiRequestSchema,
  response: AgentInfoApiResponseSchema,
});

export const GetAgentVersionBundleInfoApiContract = defineApiContract({
  name: 'GetAgentVersionBundleInfoApi',
  method: 'POST',
  endpoint: '/agent/getAgentVersionBundleInfo',
  requestPlacement: 'query',
  transport: 'json',
  request: GetAgentVersionBundleInfoApiRequestSchema,
  response: AgentVersionBundleApiResponseSchema,
});

export const ChangeAgentInfoApiContract = defineApiContract({
  name: 'ChangeAgentInfoApi',
  method: 'POST',
  endpoint: '/agent/changeAgentInfo',
  requestPlacement: 'body',
  transport: 'json',
  request: UpdateAgentInfoApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const UpdateAgentSpecApiContract = defineApiContract({
  name: 'UpdateAgentSpecApi',
  method: 'POST',
  endpoint: '/agent/updateAgentSpec',
  requestPlacement: 'body',
  transport: 'json',
  request: UpdateAgentSpecApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const PublishAgentVersionApiContract = defineApiContract({
  name: 'PublishAgentVersionApi',
  method: 'POST',
  endpoint: '/agent/publishAgentVersion',
  requestPlacement: 'body',
  transport: 'json',
  request: PublishAgentVersionApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const InitUploadAgentAssetsApiContract = defineApiContract({
  name: 'InitUploadAgentAssetsApi',
  method: 'POST',
  endpoint: '/agent/initUploadAgentAssets',
  requestPlacement: 'body',
  transport: 'json',
  request: InitUploadAgentAssetsApiRequestSchema,
  response: InitUploadAgentAssetsApiResponseSchema,
});

export const DeleteAgentAssetsApiContract = defineApiContract({
  name: 'DeleteAgentAssetsApi',
  method: 'POST',
  endpoint: '/agent/deleteAgentAssets',
  requestPlacement: 'body',
  transport: 'json',
  request: DeleteAgentAssetsApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const CancelUploadAgentAssetsApiContract = defineApiContract({
  name: 'CancelUploadAgentAssetsApi',
  method: 'POST',
  endpoint: '/agent/cancelUploadAgentAssets',
  requestPlacement: 'body',
  transport: 'json',
  request: CancelUploadAgentAssetsApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export type CreateAgentApiContractRequest = ApiContractRequest<typeof CreateAgentApiContract>;
export type CreateAgentApiContractResponse = ApiContractResponse<typeof CreateAgentApiContract>;
export type GetAgentInfoApiContractRequest = ApiContractRequest<typeof GetAgentInfoApiContract>;
export type GetAgentInfoApiContractResponse = ApiContractResponse<typeof GetAgentInfoApiContract>;
export type GetAgentVersionBundleInfoApiContractRequest = ApiContractRequest<
  typeof GetAgentVersionBundleInfoApiContract
>;
export type GetAgentVersionBundleInfoApiContractResponse = ApiContractResponse<
  typeof GetAgentVersionBundleInfoApiContract
>;
export type ChangeAgentInfoApiContractRequest = ApiContractRequest<
  typeof ChangeAgentInfoApiContract
>;
export type UpdateAgentSpecApiContractRequest = ApiContractRequest<
  typeof UpdateAgentSpecApiContract
>;
export type PublishAgentVersionApiContractRequest = ApiContractRequest<
  typeof PublishAgentVersionApiContract
>;
export type InitUploadAgentAssetsApiContractRequest = ApiContractRequest<
  typeof InitUploadAgentAssetsApiContract
>;
export type InitUploadAgentAssetsApiContractResponse = ApiContractResponse<
  typeof InitUploadAgentAssetsApiContract
>;
export type DeleteAgentAssetsApiContractRequest = ApiContractRequest<
  typeof DeleteAgentAssetsApiContract
>;
export type CancelUploadAgentAssetsApiContractRequest = ApiContractRequest<
  typeof CancelUploadAgentAssetsApiContract
>;
