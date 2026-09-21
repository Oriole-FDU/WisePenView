/** 登录请求参数 */
export interface LoginRequest {
  account: string;
  password: string;
}

/** 注册请求参数 */
export interface RegisterRequest {
  username: string;
  password: string;
  /** 邀请人的邀请码，选填；填写后注册成功即建立邀请关系 */
  inviteCode?: string;
}

/** 忘记密码-发送邮件请求参数 */
export interface ResetPasswordRequest {
  userName: string;
}

/** 忘记密码-重置新密码请求参数 */
export interface NewPasswordRequest {
  newPassword: string;
  token: string;
}
