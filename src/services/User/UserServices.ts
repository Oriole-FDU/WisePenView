import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import type { ApiResponse } from '@/types/api';
import type {
  ConfirmEmailVerifyRequest,
  GetUserInfoResponse,
  SendEmailVerifyRequest,
  UpdateUserProfileRequest,
} from './index.type';

/** 获取当前登录用户信息 */
const fetchUserInfo = async (): Promise<GetUserInfoResponse> => {
  const res = (await Axios.get('/user/info')) as ApiResponse<GetUserInfoResponse>;
  checkResponse(res);
  return res.data;
};

/** 发起邮箱验证（发送验证邮件）。仅限未验证状态用户调用，系统将发送包含验证链接的邮件。 */
const sendEmailVerify = async (params: SendEmailVerifyRequest): Promise<void> => {
  const res = (await Axios.post('/user/verify/email', null, {
    params: { suffixType: params.suffixType },
  })) as ApiResponse;
  checkResponse(res);
};

/** 确认邮箱验证（点击邮件中的验证链接后调用）。 */
const confirmEmailVerify = async (params: ConfirmEmailVerifyRequest): Promise<void> => {
  const res = (await Axios.get('/user/verify/check', {
    params: { token: params.token },
  })) as ApiResponse;
  checkResponse(res);
};

/** 更新用户档案（基本档案字段） */
const updateUserProfile = async (
  params: UpdateUserProfileRequest
): Promise<GetUserInfoResponse> => {
  const res = (await Axios.put('/user/info', params)) as ApiResponse<GetUserInfoResponse>;
  checkResponse(res);
  return res.data;
};

export const UserServices = {
  fetchUserInfo,
  sendEmailVerify,
  confirmEmailVerify,
  updateUserProfile,
};
