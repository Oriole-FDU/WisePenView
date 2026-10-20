import { mockPage, mockResponse } from '@/domains/_shared/mock/response';
import type {
  UserIdentityTypeApiValue,
  UserStatusApiValue,
} from '@/domains/User/apis/UserApi.type';

import type { AdminUserApi as AdminUserApiContract } from '../apis/AdminUserApi';
import type { AdminUserApiModel } from '../apis/AdminUserApi.type';
import mockdata from './mockdata.json';

const normalizeIdentityType = (value: string): UserIdentityTypeApiValue => {
  if (value === '2' || value === 'TEACHER') return 'TEACHER';
  if (value === '3' || value === 'ADMIN') return 'ADMIN';
  return 'STUDENT';
};

const normalizeUserStatus = (value: string): UserStatusApiValue => {
  if (value === 'BANNED') return 'BANNED';
  if (value === 'UNIDENTIFIED') return 'UNIDENTIFIED';
  return 'NORMAL';
};

const users: AdminUserApiModel[] = mockdata.users.map((user) => ({
  userId: user.userId,
  username: user.username,
  nickname: user.nickname,
  realName: user.realName,
  avatar: user.avatar || null,
  identityType: normalizeIdentityType(user.identityType),
  campusNo: user.campusNo,
  email: user.email,
  mobile: user.mobile,
  verificationMode: user.verificationMode as AdminUserApiModel['verificationMode'],
  verificationProviderCode: null,
  userStatus: normalizeUserStatus(user.status),
  createTime: Date.parse(user.createTime),
  updateTime: Date.parse(user.updateTime),
}));
export const AdminUserApi: typeof AdminUserApiContract = {
  getUserList: (params) => mockResponse(mockPage(users, params)),
  getUserInfo: ({ userId }) =>
    mockResponse({
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
      createTime: users.find((user) => user.userId === userId)?.createTime ?? null,
      updateTime: users.find((user) => user.userId === userId)?.updateTime ?? null,
    }),
  changeUserInfo: async () => undefined,
  changeUserProfile: async () => undefined,
  resetPassword: async () => undefined,
};
