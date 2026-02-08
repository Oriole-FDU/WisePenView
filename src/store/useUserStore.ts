import { create } from 'zustand';
import Axios from '@/utils/Axios';

// 只存储需要的用户字段
type User = {
    id: number;
    username: string;
    nickname?: string;
    avatar?: string;
    identityType: number;
    realName?: string;
    campusNo?: string;
};

// API 返回的完整用户信息（包含所有字段，但不存储）
type APIUserInfo = {
    id: number;
    username: string;
    nickname?: string;
    avatar?: string;
    identityType: number;
    realName?: string;
    campusNo?: string;
    academicTitle?: string;
    className?: string;
    college?: string;
    createTime?: string;
    degreeLevel?: number;
    email?: string;
    enrollmentYear?: string;
    major?: string;
    mobile?: string;
    password?: string | null;
    sex?: number;
    status?: number;
    university?: string | null;
};

type UserInfoResponse = {
    code: number;
    msg: string;
    data: APIUserInfo;
};

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
        const res = (await Axios.get('/user/info')) as UserInfoResponse;
        const apiData = res.data;
        // 只提取需要的字段存储
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
