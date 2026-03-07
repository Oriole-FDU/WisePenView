import type { ApiResponse } from '@/types/api';

/** 校验标准返回体，失败时抛出 Error(res.msg ?? '请求失败') */
export const checkResponse = (res: ApiResponse): void => {
    if (res?.code !== 0) {
        throw new Error(res?.msg ?? '请求失败');
    }
};
