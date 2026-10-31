import { executeApiContract } from '@/apis/executeApiContract';

import {
  ListUserInviteRecordsApiContract,
  type ListUserInviteRecordsApiContractRequest,
  type ListUserInviteRecordsApiContractResponse,
} from './UserInviteApi.contract';

function listInviteRecords(
  request: ListUserInviteRecordsApiContractRequest
): Promise<ListUserInviteRecordsApiContractResponse> {
  return executeApiContract(ListUserInviteRecordsApiContract, request);
}

export const UserInviteApi = { listInviteRecords };
