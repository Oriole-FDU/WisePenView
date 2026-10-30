import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiResponseSchema } from '@/apis/schema';

import {
  CancelUploadSkillAssetsApiRequestSchema,
  CreateSkillApiRequestSchema,
  DeleteSkillAssetsApiRequestSchema,
  ForkSkillApiRequestSchema,
  GetSkillAssetStsTokenApiRequestSchema,
  GetSkillAssetStsTokenApiResponseSchema,
  GetSkillInfoApiRequestSchema,
  GetSkillVersionBundleInfoApiRequestSchema,
  InitUploadSkillAssetsApiRequestSchema,
  InitUploadSkillAssetsApiResponseSchema,
  PublishSkillVersionApiRequestSchema,
  SkillInfoApiResponseSchema,
  SkillResourceIdApiResponseSchema,
  SkillVersionBundleApiResponseSchema,
  UpdateSkillInfoApiRequestSchema,
} from './SkillApi.schema';

export const CreateSkillApiContract = defineApiContract({
  name: 'CreateSkillApi',
  method: 'POST',
  endpoint: '/skill/createSkill',
  requestPlacement: 'body',
  transport: 'json',
  request: CreateSkillApiRequestSchema,
  response: SkillResourceIdApiResponseSchema,
});

export const ForkSkillApiContract = defineApiContract({
  name: 'ForkSkillApi',
  method: 'POST',
  endpoint: '/skill/forkSkill',
  requestPlacement: 'body',
  transport: 'json',
  request: ForkSkillApiRequestSchema,
  response: SkillResourceIdApiResponseSchema,
});

export const GetSkillInfoApiContract = defineApiContract({
  name: 'GetSkillInfoApi',
  method: 'POST',
  endpoint: '/skill/getSkillInfo',
  requestPlacement: 'query',
  transport: 'json',
  request: GetSkillInfoApiRequestSchema,
  response: SkillInfoApiResponseSchema,
});

export const GetSkillVersionBundleInfoApiContract = defineApiContract({
  name: 'GetSkillVersionBundleInfoApi',
  method: 'POST',
  endpoint: '/skill/getSkillVersionBundleInfo',
  requestPlacement: 'query',
  transport: 'json',
  request: GetSkillVersionBundleInfoApiRequestSchema,
  response: SkillVersionBundleApiResponseSchema,
});

export const GetSkillAssetStsTokenApiContract = defineApiContract({
  name: 'GetSkillAssetStsTokenApi',
  method: 'GET',
  endpoint: '/skill/getSkillAssetStsToken',
  requestPlacement: 'query',
  transport: 'json',
  request: GetSkillAssetStsTokenApiRequestSchema,
  response: GetSkillAssetStsTokenApiResponseSchema,
});

export const ChangeSkillInfoApiContract = defineApiContract({
  name: 'ChangeSkillInfoApi',
  method: 'POST',
  endpoint: '/skill/changeSkillInfo',
  requestPlacement: 'body',
  transport: 'json',
  request: UpdateSkillInfoApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const InitUploadSkillAssetsApiContract = defineApiContract({
  name: 'InitUploadSkillAssetsApi',
  method: 'POST',
  endpoint: '/skill/initUploadSkillAssets',
  requestPlacement: 'body',
  transport: 'json',
  request: InitUploadSkillAssetsApiRequestSchema,
  response: InitUploadSkillAssetsApiResponseSchema,
});

export const DeleteSkillAssetsApiContract = defineApiContract({
  name: 'DeleteSkillAssetsApi',
  method: 'POST',
  endpoint: '/skill/deleteSkillAssets',
  requestPlacement: 'body',
  transport: 'json',
  request: DeleteSkillAssetsApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const CancelUploadSkillAssetsApiContract = defineApiContract({
  name: 'CancelUploadSkillAssetsApi',
  method: 'POST',
  endpoint: '/skill/cancelUploadSkillAssets',
  requestPlacement: 'body',
  transport: 'json',
  request: CancelUploadSkillAssetsApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const PublishSkillVersionApiContract = defineApiContract({
  name: 'PublishSkillVersionApi',
  method: 'POST',
  endpoint: '/skill/publishSkillVersion',
  requestPlacement: 'body',
  transport: 'json',
  request: PublishSkillVersionApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export type CreateSkillApiContractRequest = ApiContractRequest<typeof CreateSkillApiContract>;
export type CreateSkillApiContractResponse = ApiContractResponse<typeof CreateSkillApiContract>;
export type ForkSkillApiContractRequest = ApiContractRequest<typeof ForkSkillApiContract>;
export type ForkSkillApiContractResponse = ApiContractResponse<typeof ForkSkillApiContract>;
export type GetSkillInfoApiContractRequest = ApiContractRequest<typeof GetSkillInfoApiContract>;
export type GetSkillInfoApiContractResponse = ApiContractResponse<typeof GetSkillInfoApiContract>;
export type GetSkillVersionBundleInfoApiContractRequest = ApiContractRequest<
  typeof GetSkillVersionBundleInfoApiContract
>;
export type GetSkillVersionBundleInfoApiContractResponse = ApiContractResponse<
  typeof GetSkillVersionBundleInfoApiContract
>;
export type GetSkillAssetStsTokenApiContractRequest = ApiContractRequest<
  typeof GetSkillAssetStsTokenApiContract
>;
export type GetSkillAssetStsTokenApiContractResponse = ApiContractResponse<
  typeof GetSkillAssetStsTokenApiContract
>;
export type ChangeSkillInfoApiContractRequest = ApiContractRequest<
  typeof ChangeSkillInfoApiContract
>;
export type InitUploadSkillAssetsApiContractRequest = ApiContractRequest<
  typeof InitUploadSkillAssetsApiContract
>;
export type InitUploadSkillAssetsApiContractResponse = ApiContractResponse<
  typeof InitUploadSkillAssetsApiContract
>;
export type DeleteSkillAssetsApiContractRequest = ApiContractRequest<
  typeof DeleteSkillAssetsApiContract
>;
export type CancelUploadSkillAssetsApiContractRequest = ApiContractRequest<
  typeof CancelUploadSkillAssetsApiContract
>;
export type PublishSkillVersionApiContractRequest = ApiContractRequest<
  typeof PublishSkillVersionApiContract
>;
