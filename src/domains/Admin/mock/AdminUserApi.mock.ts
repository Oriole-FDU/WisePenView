import { mockPage, mockResponse } from '@/domains/_shared/mock/response';

import type { AdminUserApi as AdminUserApiContract } from '../apis/AdminUserApi';
import type { AdminUserApiModel, FetchAdminUserListApiRequest } from '../apis/AdminUserApi.type';
import mockdata from './mockdata.json';

const users: AdminUserApiModel[] = [
  ...(structuredClone(mockdata.users) as AdminUserApiModel[]),
  ...Array.from({ length: 12 }, (_, index) => ({
    userId: `900719925474100${index + 1}`,
    username: `mock.user.${index + 1}`,
    nickname: `模拟用户 ${index + 1}`,
    realName: `测试用户 ${index + 1}`,
    avatar: '',
    identityType: String((index % 3) + 1) as AdminUserApiModel['identityType'],
    campusNo: `M2026${String(index + 1).padStart(4, '0')}`,
    email: `mock${index + 1}@example.com`,
    mobile: `1380001${String(index + 1).padStart(4, '0')}`,
    verificationMode: 'EDU_EMAIL' as const,
    userStatus: (index % 4 === 0 ? 'BANNED' : 'NORMAL') as AdminUserApiModel['userStatus'],
    createTime: '2026-05-03 10:00:00',
    updateTime: '2026-05-12 12:00:00',
  })),
];

const filterUsers = (params: FetchAdminUserListApiRequest): AdminUserApiModel[] => {
  const keyword = params.keyword.trim().toLowerCase();
  return users.filter((user) => {
    const matchesKeyword =
      !keyword ||
      [user.userId, user.username, user.nickname, user.realName, user.campusNo].some(
        (value) => value != null && String(value).toLowerCase().includes(keyword)
      );
    const matchesStatus = !params.userStatus || user.userStatus === params.userStatus;
    const matchesIdentity = !params.identityType || user.identityType === params.identityType;
    return matchesKeyword && matchesStatus && matchesIdentity;
  });
};

export const AdminUserApi: typeof AdminUserApiContract = {
  getUserList: (params) => mockResponse(mockPage(filterUsers(params), params)),
  getUserInfo: ({ userId }) =>
    mockResponse({
      userId,
      sex: 'UNKNOWN',
      university: '复旦大学',
      college: '计算机学院',
      major: '软件工程',
      className: '2024 级 1 班',
      enrollmentYear: 2024,
      degreeLevel: 'UNDERGRADUATE',
      academicTitle: '学生',
      createTime: '2024-09-01T00:00:00Z',
      updateTime: '2026-04-08T00:00:00Z',
    }),
  changeUserInfo: async () => undefined,
  changeUserProfile: async () => undefined,
  resetPassword: async () => undefined,
};
