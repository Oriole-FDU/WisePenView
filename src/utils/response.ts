import type { ApiResponse } from '@/types/api';

/** 校验标准返回体：`code === 200` 为成功，否则抛出 Error(res.msg ?? '请求失败') */
export const checkResponse = (res: ApiResponse): void => {
  if (res?.code !== 200) {
    throw new Error(res?.msg ?? '请求失败');
  }
};
