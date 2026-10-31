import { executeApiContract } from '@/apis/executeApiContract';

import {
  CompleteTourApiContract,
  ListUserTourStatusApiContract,
  type ListUserTourStatusApiContractResponse,
} from './UserTourApi.contract';
import type { TourCodeApiValue } from './UserTourApi.schema';

function listTourStatus(): Promise<ListUserTourStatusApiContractResponse> {
  return executeApiContract(ListUserTourStatusApiContract, undefined);
}

async function completeTour(tourCode: TourCodeApiValue): Promise<void> {
  await executeApiContract(CompleteTourApiContract, { tourCode });
}

export const UserTourApi = {
  listTourStatus,
  completeTour,
};
