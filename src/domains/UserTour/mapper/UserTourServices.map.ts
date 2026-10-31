import type { UserTourStatusApiResponse } from '../apis/UserTourApi.schema';
import type { UserTourStatus } from '../entity/userTour';

const mapTourStatusesFromApi = (data: UserTourStatusApiResponse[]): UserTourStatus[] =>
  data.map(({ tourCode, completed }) => ({
    tourCode,
    completed: completed === true,
  }));

export const UserTourServicesMap = {
  mapTourStatusesFromApi,
};
