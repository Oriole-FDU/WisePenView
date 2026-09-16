import { mockPage, mockResponse } from '@/domains/_shared/mock/response';
import type { AdminUserApi as AdminUserApiContract } from '../apis/AdminUserApi';
import type { AdminUserApiModel } from '../apis/AdminUserApi.type';
import mockdata from './mockdata.json';

const users: AdminUserApiModel[] = structuredClone(mockdata.users) as AdminUserApiModel[];
export const AdminUserApi: typeof AdminUserApiContract = {
  getUserList: (params) => mockResponse(mockPage(users, params)),
  getUserInfo: ({ userId }) => mockResponse({ userId }),
  changeUserInfo: async () => undefined,
  changeUserProfile: async () => undefined,
  resetPassword: async () => undefined,
};
