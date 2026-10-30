import { executeApiContract } from '@/apis/executeApiContract';

import {
  ChangeResourceLikeApiContract,
  type ChangeResourceLikeApiContractRequest,
  GetResourceUserInteractionRecordApiContract,
  type GetResourceUserInteractionRecordApiContractRequest,
  type GetResourceUserInteractionRecordApiContractResponse,
  RateResourceApiContract,
  type RateResourceApiContractRequest,
  RecordResourceReadApiContract,
  type RecordResourceReadApiContractRequest,
} from './InteractApi.contract';

/** /resource/interaction/* 子路由 API */
async function setLike(req: ChangeResourceLikeApiContractRequest): Promise<void> {
  await executeApiContract(ChangeResourceLikeApiContract, req);
}

async function rate(req: RateResourceApiContractRequest): Promise<void> {
  await executeApiContract(RateResourceApiContract, req);
}

async function read(req: RecordResourceReadApiContractRequest): Promise<void> {
  await executeApiContract(RecordResourceReadApiContract, req);
}

function getUserInteractionRecord(
  req: GetResourceUserInteractionRecordApiContractRequest
): Promise<GetResourceUserInteractionRecordApiContractResponse> {
  return executeApiContract(GetResourceUserInteractionRecordApiContract, req);
}

export const InteractApi = { setLike, rate, read, getUserInteractionRecord };
