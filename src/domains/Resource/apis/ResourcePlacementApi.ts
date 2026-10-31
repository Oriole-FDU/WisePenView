import { executeApiContract } from '@/apis/executeApiContract';

import {
  MountResourcesToGroupApiContract,
  MovePersonalResourcesToTrashApiContract,
  MoveResourcesInGroupApiContract,
  ReplacePersonalNormalTagsApiContract,
  SetPersonalResourcesPathTagApiContract,
  UnmountResourcesToGroupApiContract,
} from './ResourcePlacementApi.contract';
import type {
  MountResourcesToGroupApiRequest,
  MovePersonalResourcesToTrashApiRequest,
  MoveResourcesInGroupApiRequest,
  ReplacePersonalNormalTagsApiRequest,
  ResourcePlacementApiResponse,
  SetPersonalResourcesPathTagApiRequest,
  UnmountResourcesToGroupApiRequest,
} from './ResourcePlacementApi.schema';

function setPersonalResourcesPathTag(
  req: SetPersonalResourcesPathTagApiRequest
): Promise<ResourcePlacementApiResponse> {
  return executeApiContract(SetPersonalResourcesPathTagApiContract, req);
}

function movePersonalResourcesToTrash(
  req: MovePersonalResourcesToTrashApiRequest
): Promise<ResourcePlacementApiResponse> {
  return executeApiContract(MovePersonalResourcesToTrashApiContract, req);
}

function replacePersonalNormalTags(
  req: ReplacePersonalNormalTagsApiRequest
): Promise<ResourcePlacementApiResponse> {
  return executeApiContract(ReplacePersonalNormalTagsApiContract, req);
}

function mountResourcesToGroup(
  req: MountResourcesToGroupApiRequest
): Promise<ResourcePlacementApiResponse> {
  return executeApiContract(MountResourcesToGroupApiContract, req);
}

function unmountResourcesToGroup(
  req: UnmountResourcesToGroupApiRequest
): Promise<ResourcePlacementApiResponse> {
  return executeApiContract(UnmountResourcesToGroupApiContract, req);
}

function moveResourcesInGroup(
  req: MoveResourcesInGroupApiRequest
): Promise<ResourcePlacementApiResponse> {
  return executeApiContract(MoveResourcesInGroupApiContract, req);
}

export const ResourcePlacementApi = {
  setPersonalResourcesPathTag,
  movePersonalResourcesToTrash,
  replacePersonalNormalTags,
  mountResourcesToGroup,
  unmountResourcesToGroup,
  moveResourcesInGroup,
};
