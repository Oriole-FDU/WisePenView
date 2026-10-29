import { executeApiContract } from '@/apis/executeApiContract';

import type {
  AddTagApiRequest,
  AddTagApiResponse,
  ChangeTagApiRequest,
  ChangeTagApiResponse,
  GetGroupTagTreeApiRequest,
  GetGroupTagTreeApiResponse,
  GetPersonalTagTreeApiResponse,
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
  GetGroupTagTreeApiContract,
  GetPersonalTagTreeApiContract,
  GetTagTreeApiContract,
  MoveTagsApiContract,
  RemoveTagsApiContract,
} from './TagApi.contract';

async function getPersonalTagTree(): Promise<GetPersonalTagTreeApiResponse> {
  return executeApiContract(GetPersonalTagTreeApiContract, undefined);
}

async function getGroupTagTree(
  req: GetGroupTagTreeApiRequest
): Promise<GetGroupTagTreeApiResponse> {
  return executeApiContract(GetGroupTagTreeApiContract, req);
}

/** @deprecated 使用 getPersonalTagTree 或 getGroupTagTree。 */
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
  getPersonalTagTree,
  getGroupTagTree,
  getTagTree,
  addTag,
  changeTag,
  removeTags,
  moveTags,
};
