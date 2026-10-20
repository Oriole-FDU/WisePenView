export interface LoginApiRequest {
  account: string;
  password: string;
  code?: string;
  uuid?: string;
}

export interface RegisterApiRequest {
  username: string;
  password: string;
  /** 邀请码，选填；与后端 AuthRegisterRequest.inviteCode 对齐 */
  inviteCode?: string;
}

export interface ResetPasswordApiRequest {
  username: string;
  code?: string;
  uuid?: string;
}

export interface NewPasswordApiRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordApiRequest {
  oldPassword: string;
  newPassword: string;
}

export type LoginApiResponse = string;
export type LogoutApiResponse = void;
export type RegisterApiResponse = null;
export type ResetPasswordApiResponse = void;
export type NewPasswordApiResponse = void;
export type ChangePasswordApiResponse = void;
