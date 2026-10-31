import { mockPage, mockResponse } from '@/domains/_shared/mock/response';

import type { AdminUserApi as AdminUserApiContract } from '../apis/AdminUserApi';
import type { AdminUserApiModel, GetAdminUserInfoApiResponse } from '../apis/AdminUserApi.schema';
import mockdata from './mockdata.json';

const users: AdminUserApiModel[] = structuredClone(mockdata.users).map((user) => ({
  userId: user.userId,
  username: user.username,
  nickname: user.nickname,
  realName: user.realName,
  avatar: user.avatar,
  identityType: Number(user.identityType) as 1 | 2 | 3,
  campusNo: user.campusNo,
  email: user.email,
  mobile: user.mobile,
  verificationMode: user.verificationMode === 'EDU_EMAIL' ? 'EDU_EMAIL' : null,
  verificationProviderCode: null,
  userStatus: user.status as AdminUserApiModel['userStatus'],
  createTime: Date.parse(user.createTime),
  updateTime: Date.parse(user.updateTime),
}));

const userProfile = (userId: string): GetAdminUserInfoApiResponse => ({
  userId,
  sex: null,
  inviteCode: null,
  university: null,
  college: null,
  major: null,
  className: null,
  enrollmentYear: null,
  degreeLevel: null,
  academicTitle: null,
  createTime: users[0].createTime,
  updateTime: users[0].updateTime,
});

export const AdminUserApi: typeof AdminUserApiContract = {
  getUserList: (params) => mockResponse(mockPage(users, params)),
  getUserInfo: ({ userId }) => mockResponse(userProfile(userId)),
  changeUserInfo: async () => undefined,
  changeUserProfile: async () => undefined,
  resetPassword: async () => undefined,
};
