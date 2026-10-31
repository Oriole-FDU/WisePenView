import { executeApiContract } from '@/apis/executeApiContract';

import {
  CancelUploadSkillAssetsApiContract,
  type CancelUploadSkillAssetsApiContractRequest,
  ChangeSkillInfoApiContract,
  type ChangeSkillInfoApiContractRequest,
  CreateSkillApiContract,
  type CreateSkillApiContractRequest,
  type CreateSkillApiContractResponse,
  DeleteSkillAssetsApiContract,
  type DeleteSkillAssetsApiContractRequest,
  ForkSkillApiContract,
  type ForkSkillApiContractRequest,
  type ForkSkillApiContractResponse,
  GetSkillAssetStsTokenApiContract,
  type GetSkillAssetStsTokenApiContractRequest,
  type GetSkillAssetStsTokenApiContractResponse,
  GetSkillInfoApiContract,
  type GetSkillInfoApiContractRequest,
  type GetSkillInfoApiContractResponse,
  GetSkillVersionBundleInfoApiContract,
  type GetSkillVersionBundleInfoApiContractRequest,
  type GetSkillVersionBundleInfoApiContractResponse,
  InitUploadSkillAssetsApiContract,
  type InitUploadSkillAssetsApiContractRequest,
  type InitUploadSkillAssetsApiContractResponse,
  PublishSkillVersionApiContract,
  type PublishSkillVersionApiContractRequest,
} from './SkillApi.contract';

function createSkill(body: CreateSkillApiContractRequest): Promise<CreateSkillApiContractResponse> {
  return executeApiContract(CreateSkillApiContract, body);
}

function forkSkill(body: ForkSkillApiContractRequest): Promise<ForkSkillApiContractResponse> {
  return executeApiContract(ForkSkillApiContract, body);
}

function getSkillInfo(
  query: GetSkillInfoApiContractRequest
): Promise<GetSkillInfoApiContractResponse> {
  return executeApiContract(GetSkillInfoApiContract, query);
}

function getSkillVersionBundleInfo(
  query: GetSkillVersionBundleInfoApiContractRequest
): Promise<GetSkillVersionBundleInfoApiContractResponse> {
  return executeApiContract(GetSkillVersionBundleInfoApiContract, query);
}

function getSkillAssetStsToken(
  query: GetSkillAssetStsTokenApiContractRequest
): Promise<GetSkillAssetStsTokenApiContractResponse> {
  return executeApiContract(GetSkillAssetStsTokenApiContract, query);
}

function changeSkillInfo(body: ChangeSkillInfoApiContractRequest): Promise<null> {
  return executeApiContract(ChangeSkillInfoApiContract, body);
}

function initUploadSkillAssets(
  body: InitUploadSkillAssetsApiContractRequest
): Promise<InitUploadSkillAssetsApiContractResponse> {
  return executeApiContract(InitUploadSkillAssetsApiContract, body);
}

function deleteSkillAssets(body: DeleteSkillAssetsApiContractRequest): Promise<null> {
  return executeApiContract(DeleteSkillAssetsApiContract, body);
}

function cancelUploadSkillAssets(body: CancelUploadSkillAssetsApiContractRequest): Promise<null> {
  return executeApiContract(CancelUploadSkillAssetsApiContract, body);
}

function publishSkillVersion(body: PublishSkillVersionApiContractRequest): Promise<null> {
  return executeApiContract(PublishSkillVersionApiContract, body);
}

export const SkillApi = {
  createSkill,
  forkSkill,
  getSkillInfo,
  getSkillVersionBundleInfo,
  getSkillAssetStsToken,
  changeSkillInfo,
  initUploadSkillAssets,
  cancelUploadSkillAssets,
  deleteSkillAssets,
  publishSkillVersion,
};
