import { create } from 'zustand';
import Axios from '@/utils/Axios';
import type { APIUserInfo, User } from '@/types/user';

import type { ApiResponse } from '@/types/api';

type UserStore = {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
  fetchUserInfo: () => Promise<User>;
};

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  fetchUserInfo: async () => {
    const res = (await Axios.get('/user/info')) as ApiResponse<APIUserInfo>;
    const apiData: APIUserInfo = res.data;
    const user: User = {
      id: apiData.id,
      username: apiData.username,
      nickname: apiData.nickname,
      avatar: apiData.avatar,
      identityType: apiData.identityType,
      realName: apiData.realName,
      campusNo: apiData.campusNo,
    };
    set({ user });
    return user;
  },
}));
