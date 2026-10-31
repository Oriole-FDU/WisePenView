import { executeApiContract } from '@/apis/executeApiContract';

import {
  CheckEmailVerifyApiContract,
  type CheckEmailVerifyApiContractRequest,
  CheckFudanUISVerifyApiContract,
  type CheckFudanUISVerifyApiContractResponse,
  InitiateEmailVerifyApiContract,
  type InitiateEmailVerifyApiContractRequest,
  InitiateFudanUISVerifyApiContract,
  type InitiateFudanUISVerifyApiContractRequest,
} from './UserVerificationApi.contract';

async function initiateEmailVerify(request: InitiateEmailVerifyApiContractRequest): Promise<void> {
  await executeApiContract(InitiateEmailVerifyApiContract, request);
}

async function initiateFudanUISVerify(
  request: InitiateFudanUISVerifyApiContractRequest
): Promise<void> {
  await executeApiContract(InitiateFudanUISVerifyApiContract, request);
}

function checkFudanUISVerify(): Promise<CheckFudanUISVerifyApiContractResponse> {
  return executeApiContract(CheckFudanUISVerifyApiContract, undefined);
}

async function checkEmailVerify(request: CheckEmailVerifyApiContractRequest): Promise<void> {
  await executeApiContract(CheckEmailVerifyApiContract, request);
}

export const UserVerificationApi = {
  initiateEmailVerify,
  initiateFudanUISVerify,
  checkFudanUISVerify,
  checkEmailVerify,
};
