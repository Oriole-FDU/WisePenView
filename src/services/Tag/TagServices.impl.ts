import type { ApiResponse } from '@/types/api';
import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import { filterNonPathTags, flattenTagTree } from '@/utils/tagTree';
import type {
  FlatTagTreeResponse,
  GetTagTreeRequest,
  TagTreeResponse,
  TagCreateRequest,
  TagUpdateRequest,
  TagDeleteRequest,
  TagMoveRequest,
} from './index.type';
import type { ITagService } from './index.type';

const fetchRawTagTree = async (params?: GetTagTreeRequest): Promise<TagTreeResponse[]> => {
  const res = (await Axios.get('/resource/tag/getTagTree', {
    params: params?.groupId != null ? { groupId: params.groupId } : undefined,
  })) as ApiResponse<TagTreeResponse[]>;
  checkResponse(res);
  return res.data ?? [];
};

const getTagTree = async (params?: GetTagTreeRequest): Promise<TagTreeResponse[]> => {
  const raw = await fetchRawTagTree(params);
  return filterNonPathTags(raw);
};

const getFlatTagTree = async (params?: GetTagTreeRequest): Promise<FlatTagTreeResponse[]> => {
  const raw = await fetchRawTagTree(params);
  const tree = filterNonPathTags(raw);
  return flattenTagTree(tree);
};

const updateTag = async (params: TagUpdateRequest): Promise<void> => {
  const res = (await Axios.post('/resource/tag/changeTag', params)) as ApiResponse;
  checkResponse(res);
};

const addTag = async (params: TagCreateRequest): Promise<string> => {
  const res = (await Axios.post('/resource/tag/addTag', params)) as ApiResponse<string>;
  checkResponse(res);
  return res.data ?? '';
};

const deleteTag = async (params: TagDeleteRequest): Promise<void> => {
  const res = (await Axios.post('/resource/tag/removeTag', params)) as ApiResponse;
  checkResponse(res);
};

const moveTag = async (params: TagMoveRequest): Promise<void> => {
  const res = (await Axios.post('/resource/tag/moveTag', params)) as ApiResponse;
  checkResponse(res);
};

export const TagServicesImpl: ITagService = {
  getTagTree,
  getFlatTagTree,
  updateTag,
  addTag,
  deleteTag,
  moveTag,
};
