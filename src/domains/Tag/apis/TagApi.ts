import { apiGet, apiPost } from '@/apis/request';

import type {
  AddTagApiRequest,
  ChangeTagApiRequest,
  GetTagTreeApiRequest,
  GetTagTreeApiResponse,
  MoveTagsApiRequest,
  RemoveTagsApiRequest,
} from './TagApi.type';

function getTagTree(req?: GetTagTreeApiRequest): Promise<GetTagTreeApiResponse> {
  return apiGet('/resource/tag/getTagTree', { params: req });
}

function addTag(req: AddTagApiRequest): Promise<string> {
  return apiPost('/resource/tag/addTag', req);
}

function changeTag(req: ChangeTagApiRequest): Promise<void> {
  return apiPost('/resource/tag/changeTag', req);
}

function removeTags(req: RemoveTagsApiRequest): Promise<void> {
  return apiPost('/resource/tag/removeTags', req);
}

function moveTags(req: MoveTagsApiRequest): Promise<void> {
  return apiPost('/resource/tag/moveTags', req);
}

export const TagApi = {
  getTagTree,
  addTag,
  changeTag,
  removeTags,
  moveTags,
};
