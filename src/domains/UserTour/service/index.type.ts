import type { TourCode, UserTourStatus } from '../entity/userTour';

export interface IUserTourService {
  listTourStatus(): Promise<UserTourStatus[]>;
  completeTour(tourCode: TourCode): Promise<void>;
}
