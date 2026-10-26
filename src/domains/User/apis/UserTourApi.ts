import { apiGetUnchecked, apiPostUnchecked } from '@/apis/request';

import type { TourCodeApiValue, UserTourStatusApiResponse } from './UserTourApi.type';

function listTourStatus(): Promise<UserTourStatusApiResponse[]> {
  return apiGetUnchecked('/user/tour/listTourStatus');
}

function completeTour(tourCode: TourCodeApiValue): Promise<void> {
  return apiPostUnchecked('/user/tour/completeTour', null, { params: { tourCode } });
}

export const UserTourApi = {
  listTourStatus,
  completeTour,
};
