import { executeApiContract } from '@/apis/executeApiContract';

import type {
  AddTagApiRequest,
  AddTagApiResponse,
  ChangeTagApiRequest,
  ChangeTagApiResponse,
  GetTagTreeApiRequest,
  GetTagTreeApiResponse,
  MoveTagsApiRequest,
  MoveTagsApiResponse,
  RemoveTagsApiRequest,
  RemoveTagsApiResponse,
} from './TagApi.contract';
import {
  AddTagApiContract,
  ChangeTagApiContract,
  GetTagTreeApiContract,
  MoveTagsApiContract,
  RemoveTagsApiContract,
} from './TagApi.contract';

async function getTagTree(req?: GetTagTreeApiRequest): Promise<GetTagTreeApiResponse> {
  return executeApiContract(GetTagTreeApiContract, req ?? {});
}

async function addTag(req: AddTagApiRequest): Promise<AddTagApiResponse> {
  return executeApiContract(AddTagApiContract, req);
}

async function changeTag(req: ChangeTagApiRequest): Promise<ChangeTagApiResponse> {
  return executeApiContract(ChangeTagApiContract, req);
}

async function removeTags(req: RemoveTagsApiRequest): Promise<RemoveTagsApiResponse> {
  return executeApiContract(RemoveTagsApiContract, req);
}

async function moveTags(req: MoveTagsApiRequest): Promise<MoveTagsApiResponse> {
  return executeApiContract(MoveTagsApiContract, req);
}

export const TagApi = {
  getTagTree,
  addTag,
  changeTag,
  removeTags,
  moveTags,
};
