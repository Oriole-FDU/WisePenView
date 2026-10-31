import { mockResponse } from '@/domains/_shared/mock/response';

import type { UserApi as UserApiContract } from '../apis/UserApi';
import type { GetUserInfoApiResponse, UserSummaryApi } from '../apis/UserInformationApi.schema';
import mockdata from './mockdata.json';

const fullUserInfo = structuredClone(mockdata) as GetUserInfoApiResponse;
const mockSearchUsers: UserSummaryApi[] = [
  {
    userId: '10086',
    username: 'xiaoming',
    nickname: '小明',
    realName: '王明',
    avatar: '',
    identityType: 1,
  },
  {
    userId: '10087',
    username: 'xiaozhang',
    nickname: '小张',
    realName: '张三',
    avatar: '',
    identityType: 2,
  },
  {
    userId: '10088',
    username: 'agentic.sig',
    nickname: 'SIG 助手',
    realName: '陈思齐',
    avatar: '',
    identityType: 3,
  },
];

export const UserApi: typeof UserApiContract = {
  getUserInfo: () => mockResponse(fullUserInfo),
  searchUser: ({ keyword }) =>
    mockResponse(mockSearchUsers.filter((u) => u.username.toLowerCase() === keyword.toLowerCase())),
  listUserSearchSuggestions: ({ keyword, size = 10 }) =>
    mockResponse(
      mockSearchUsers
        .filter((u) => u.username.toLowerCase().startsWith(keyword.toLowerCase()))
        .slice(0, size)
    ),
  changeUserInfo: async (params) => {
    Object.assign(fullUserInfo.userInfo, params);
  },
  changeUserProfile: async (params) => {
    Object.assign(fullUserInfo.userProfile, params);
  },
};
