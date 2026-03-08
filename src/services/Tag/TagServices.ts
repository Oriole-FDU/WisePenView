import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import type { ApiResponse } from '@/types/api';
import type {
  GetTagTreeRequest,
  TagTreeResponse,
  UpdateTagRequest,
} from './index.type';

/**
 * 获取完整标签树
 * 获取个人或小组的标签树，不传 groupId 则获取个人标签树
 */
const getTagTree = async (
  params?: GetTagTreeRequest
): Promise<TagTreeResponse[]> => {
  const res = (await Axios.get('/resource/tag/getTagTree', {
    params: params?.groupId ? { groupId: params.groupId } : undefined,
  })) as ApiResponse<TagTreeResponse[]>;
  checkResponse(res);
  return res.data ?? [];
};

/**
 * 更新标签
 * 更新标签名称、描述等
 */
const updateTag = async (params: UpdateTagRequest): Promise<void> => {
  const res = (await Axios.post('/resource/tag/updateTag', params)) as ApiResponse;
  checkResponse(res);
};

export const TagServices = {
  getTagTree,
  updateTag,
};
