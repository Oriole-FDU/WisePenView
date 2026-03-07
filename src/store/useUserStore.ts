import { create } from 'zustand';
import { UserServices } from '@/services/User';
import type { GetUserInfoResponse } from '@/services/User';
import type { User } from '@/types/user';

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
    const apiData: GetUserInfoResponse = await UserServices.fetchUserInfo();
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
