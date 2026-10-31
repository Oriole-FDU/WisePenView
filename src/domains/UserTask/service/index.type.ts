import type { UserTaskCheckInResult, UserTaskStatus } from '../entity/userTask';

export interface IUserTaskService {
  listTaskStatus(): Promise<UserTaskStatus[]>;
  dailyCheckIn(): Promise<UserTaskCheckInResult>;
}
