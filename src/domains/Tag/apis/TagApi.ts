import { apiGetUnchecked, apiPostUnchecked } from '@/apis/request';

import type {
  AddTagApiRequest,
  ChangeTagApiRequest,
  GetTagTreeApiRequest,
  GetTagTreeApiResponse,
  MoveTagsApiRequest,
  RemoveTagsApiRequest,
} from './TagApi.type';

function getTagTree(req?: GetTagTreeApiRequest): Promise<GetTagTreeApiResponse> {
  return apiGetUnchecked('/resource/tag/getTagTree', { params: req });
}

function addTag(req: AddTagApiRequest): Promise<string> {
  return apiPostUnchecked('/resource/tag/addTag', req);
}

function changeTag(req: ChangeTagApiRequest): Promise<void> {
  return apiPostUnchecked('/resource/tag/changeTag', req);
}

function removeTags(req: RemoveTagsApiRequest): Promise<void> {
  return apiPostUnchecked('/resource/tag/removeTags', req);
}

function moveTags(req: MoveTagsApiRequest): Promise<void> {
  return apiPostUnchecked('/resource/tag/moveTags', req);
}

export const TagApi = {
  getTagTree,
  addTag,
  changeTag,
  removeTags,
  moveTags,
};
