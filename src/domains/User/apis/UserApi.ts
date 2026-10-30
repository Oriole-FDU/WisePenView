import type { AxiosRequestConfig } from 'axios';

import { executeApiContract } from '@/apis/executeApiContract';

import {
  AddFeedbackApiContract,
  type AddFeedbackApiContractRequest,
  ChangeUserInfoApiContract,
  type ChangeUserInfoApiContractRequest,
  ChangeUserProfileApiContract,
  type ChangeUserProfileApiContractRequest,
  CheckEmailVerifyApiContract,
  type CheckEmailVerifyApiContractRequest,
  CheckFudanUISVerifyApiContract,
  type CheckFudanUISVerifyApiContractResponse,
  InitiateEmailVerifyApiContract,
  type InitiateEmailVerifyApiContractRequest,
  InitiateFudanUISVerifyApiContract,
  type InitiateFudanUISVerifyApiContractRequest,
  ListUserInviteRecordsApiContract,
  type ListUserInviteRecordsApiContractRequest,
  type ListUserInviteRecordsApiContractResponse,
} from './AccountApi.contract';
import {
  GetUserInfoApiContract,
  type GetUserInfoApiResponse,
  ListUserSearchSuggestionsApiContract,
  type ListUserSearchSuggestionsApiRequest,
  type ListUserSearchSuggestionsApiResponse,
  SearchUsersApiContract,
  type SearchUsersApiRequest,
  type SearchUsersApiResponse,
} from './UserInformationApi.contract';

/** User API: /user/* */

async function getUserInfo(config?: AxiosRequestConfig): Promise<GetUserInfoApiResponse> {
  return executeApiContract(GetUserInfoApiContract, undefined, config);
}

async function searchUser(req: SearchUsersApiRequest): Promise<SearchUsersApiResponse> {
  return executeApiContract(SearchUsersApiContract, req);
}

async function listUserSearchSuggestions(
  req: ListUserSearchSuggestionsApiRequest
): Promise<ListUserSearchSuggestionsApiResponse> {
  return executeApiContract(ListUserSearchSuggestionsApiContract, req);
}

async function initiateEmailVerify(req: InitiateEmailVerifyApiContractRequest): Promise<void> {
  await executeApiContract(InitiateEmailVerifyApiContract, req);
}

async function initiateFudanUISVerify(
  req: InitiateFudanUISVerifyApiContractRequest
): Promise<void> {
  await executeApiContract(InitiateFudanUISVerifyApiContract, req);
}

function checkFudanUISVerify(): Promise<CheckFudanUISVerifyApiContractResponse> {
  return executeApiContract(CheckFudanUISVerifyApiContract, undefined);
}

async function checkEmailVerify(req: CheckEmailVerifyApiContractRequest): Promise<void> {
  await executeApiContract(CheckEmailVerifyApiContract, req);
}

async function changeUserInfo(req: ChangeUserInfoApiContractRequest): Promise<void> {
  await executeApiContract(ChangeUserInfoApiContract, req);
}

async function changeUserProfile(req: ChangeUserProfileApiContractRequest): Promise<void> {
  await executeApiContract(ChangeUserProfileApiContract, req);
}

async function addFeedback(req: AddFeedbackApiContractRequest): Promise<void> {
  await executeApiContract(AddFeedbackApiContract, req);
}

function listInviteRecords(
  req: ListUserInviteRecordsApiContractRequest
): Promise<ListUserInviteRecordsApiContractResponse> {
  return executeApiContract(ListUserInviteRecordsApiContract, req);
}

export const UserApi = {
  getUserInfo,
  searchUser,
  listUserSearchSuggestions,
  initiateEmailVerify,
  initiateFudanUISVerify,
  checkFudanUISVerify,
  checkEmailVerify,
  changeUserInfo,
  changeUserProfile,
  addFeedback,
  listInviteRecords,
};
