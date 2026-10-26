import { apiPostUnchecked } from '@/apis/request';

import type {
  MountResourcesToGroupApiRequest,
  MovePersonalResourcesToTrashApiRequest,
  MoveResourcesInGroupApiRequest,
  ReplacePersonalNormalTagsApiRequest,
  ResourcePlacementApiResponse,
  SetPersonalResourcesPathTagApiRequest,
  UnmountResourcesToGroupApiRequest,
} from './ResourcePlacementApi.type';

const BASE_URL = '/resource/placement';

function setPersonalResourcesPathTag(
  req: SetPersonalResourcesPathTagApiRequest
): Promise<ResourcePlacementApiResponse> {
  return apiPostUnchecked(`${BASE_URL}/setPersonalResourcesPathTag`, req);
}

function movePersonalResourcesToTrash(
  req: MovePersonalResourcesToTrashApiRequest
): Promise<ResourcePlacementApiResponse> {
  return apiPostUnchecked(`${BASE_URL}/movePersonalResourcesToTrash`, req);
}

function replacePersonalNormalTags(
  req: ReplacePersonalNormalTagsApiRequest
): Promise<ResourcePlacementApiResponse> {
  return apiPostUnchecked(`${BASE_URL}/replacePersonalNormalTags`, req);
}

function mountResourcesToGroup(
  req: MountResourcesToGroupApiRequest
): Promise<ResourcePlacementApiResponse> {
  return apiPostUnchecked(`${BASE_URL}/mountResourcesToGroup`, req);
}

function unmountResourcesToGroup(
  req: UnmountResourcesToGroupApiRequest
): Promise<ResourcePlacementApiResponse> {
  return apiPostUnchecked(`${BASE_URL}/unmountResourcesToGroup`, req);
}

function moveResourcesInGroup(
  req: MoveResourcesInGroupApiRequest
): Promise<ResourcePlacementApiResponse> {
  return apiPostUnchecked(`${BASE_URL}/moveResourcesInGroup`, req);
}

export const ResourcePlacementApi = {
  setPersonalResourcesPathTag,
  movePersonalResourcesToTrash,
  replacePersonalNormalTags,
  mountResourcesToGroup,
  unmountResourcesToGroup,
  moveResourcesInGroup,
};
