import type { ApiResponse } from '@/types/api';
import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import { filterNonPathTags } from '@/utils/tagTree';
import type {
  GetTagTreeRequest,
  TagTreeNode,
  AddTagRequest,
  ChangeTagRequest,
  RemoveTagRequest,
  UpdateTagRequest,
  MoveTagRequest,
} from './index.type';
import type { ITagService } from './index.type';

const fetchRawTagTree = async (params?: GetTagTreeRequest): Promise<TagTreeNode[]> => {
  const res = (await Axios.get('/resource/tag/getTagTree', {
    params: params?.groupId != null ? { groupId: params.groupId } : undefined,
  })) as ApiResponse<TagTreeNode[]>;
  checkResponse(res);
  return res.data ?? [];
};

const getTagTree = async (params?: GetTagTreeRequest): Promise<TagTreeNode[]> => {
  const raw = await fetchRawTagTree(params);
  return filterNonPathTags(raw);
};

const updateTag = async (params: UpdateTagRequest): Promise<void> => {
  const res = (await Axios.post('/resource/tag/changeTag', params)) as ApiResponse;
  checkResponse(res);
};

const addTag = async (params: AddTagRequest): Promise<string> => {
  const res = (await Axios.post('/resource/tag/addTag', params)) as ApiResponse<string>;
  checkResponse(res);
  return res.data ?? '';
};

const changeTag = async (params: ChangeTagRequest): Promise<void> => {
  const res = (await Axios.post('/resource/tag/changeTag', params)) as ApiResponse;
  checkResponse(res);
};

const removeTag = async (params: RemoveTagRequest): Promise<void> => {
  const res = (await Axios.post('/resource/tag/removeTag', params)) as ApiResponse;
  checkResponse(res);
};

const moveTag = async (params: MoveTagRequest): Promise<void> => {
  const res = (await Axios.post('/resource/tag/moveTag', params)) as ApiResponse;
  checkResponse(res);
};

export const TagServicesImpl: ITagService = {
  getTagTree,
  updateTag,
  addTag,
  changeTag,
  removeTag,
  moveTag,
};
