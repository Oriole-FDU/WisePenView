export type { User, UserDisplayBase } from './entity/user';
export {
  DEGREE,
  EMAIL_SUFFIX,
  IDENTITY,
  SEX,
  USER_STATUS,
  USER_VERIFICATION,
  getVerificationModeLabel,
} from './enum';
export type { DegreeLevel, UserVerificationMode } from './enum';
export type {
  ConfirmEmailVerifyRequest,
  FudanUISVerifyStatusData,
  GetUserInfoResponse,
  IUserService,
  InitiateUISVerifyRequest,
  SendEmailVerifyRequest,
  UpdateUserInfoRequest,
} from './service/index.type';
