import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import type { ApiResponse } from '@/types/api';
import type {
  GetTagTreeRequest,
  TagTreeResponse,
  CreateTagRequest,
  UpdateTagRequest,
  MoveTagRequest,
  DeleteTagRequest,
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
 * 创建标签
 * 在个人或小组指定的父节点下创建新标签
 */
const createTag = async (params: CreateTagRequest): Promise<string> => {
  const res = (await Axios.post('/resource/tag/addTag', params)) as ApiResponse<string>;
  checkResponse(res);
  return res.data ?? '';
};

/**
 * 更新标签
 * 修改标签名称、描述等元信息
 */
const updateTag = async (params: UpdateTagRequest): Promise<void> => {
  const res = (await Axios.post('/resource/tag/changeTag', params)) as ApiResponse;
  checkResponse(res);
};

/**
 * 拖拽/移动标签
 * 修改标签的树形层级结构
 */
const moveTag = async (params: MoveTagRequest): Promise<void> => {
  const res = (await Axios.post('/resource/tag/moveTag', params)) as ApiResponse;
  checkResponse(res);
};

/**
 * 级联删除标签
 * 删除指定标签及其所有子孙节点
 */
const removeTag = async (params: DeleteTagRequest): Promise<void> => {
  const res = (await Axios.post('/resource/tag/removeTag', params)) as ApiResponse;
  checkResponse(res);
};

export const TagServices = {
  getTagTree,
  createTag,
  updateTag,
  moveTag,
  removeTag,
};
