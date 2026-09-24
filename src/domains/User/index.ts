export type { UserInviteRecord, UserInviteRecordList, UserInviteStatus } from './entity/invite';
export type {
  User,
  UserAccountInfo,
  UserAccountProfile,
  UserDisplayBase,
  UserProfileInfo,
  UserSearchUser,
} from './entity/user';
export type {
  UserTaskCheckInResult,
  UserTaskCode,
  UserTaskOnceStatus,
  UserTaskPeriodicStatus,
  UserTaskRewardPreview,
  UserTaskRewardType,
  UserTaskStatus,
  UserTaskType,
} from './entity/userTask';
export type { DegreeLevel, FeedbackType, UserVerificationMode } from './enum';
export {
  DEGREE,
  EMAIL_SUFFIX,
  FEEDBACK_TYPE,
  IDENTITY,
  SEX,
  USER_STATUS,
  USER_VERIFICATION,
} from './enum';
export type {
  ConfirmEmailVerifyRequest,
  FudanUISVerifyStatusData,
  InitiateUISVerifyRequest,
  IUserService,
  ListUserInviteRecordsRequest,
  ListUserSearchSuggestionsRequest,
  QueryUserSearchCandidatesRequest,
  SearchUsersRequest,
  SendEmailVerifyRequest,
  SubmitFeedbackRequest,
  UpdateUserInfoRequest,
} from './service/index.type';
