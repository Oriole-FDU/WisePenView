import { apiGet, apiPost } from '@/apis/request';
import { serializeRepeatKeyQuery } from '@/apis/serializeRepeatKeyQuery';
import type {
  AddTagApiRequest,
  ChangeResourceActionPermissionApiRequest,
  ChangeResourceTagsApiRequest,
  ChangeTagApiRequest,
  GetTagTreeApiRequest,
  GetTagTreeApiResponse,
  ListResourceItemsApiRequest,
  MoveTagApiRequest,
  RemoveResourcesApiRequest,
  RemoveTagApiRequest,
  RenameResourceApiRequest,
  ResourceListPageApiResponse,
} from './ResourceApi.type';

// /resource/item/*

function listResources(req: ListResourceItemsApiRequest): Promise<ResourceListPageApiResponse> {
  return apiGet('/resource/item/listResources', {
    params: req,
    paramsSerializer: serializeRepeatKeyQuery,
  });
}

function renameResource(req: RenameResourceApiRequest): Promise<void> {
  return apiPost('/resource/item/renameResource', req);
}

function changeResourceTags(req: ChangeResourceTagsApiRequest): Promise<void> {
  return apiPost('/resource/item/changeResourceTags', req);
}

function changeResourceActionPermission(
  req: ChangeResourceActionPermissionApiRequest
): Promise<void> {
  return apiPost('/resource/item/changeResourceActionPermission', req);
}

function removeResources(req: RemoveResourcesApiRequest): Promise<void> {
  return apiPost('/resource/item/removeResources', null, {
    params: req,
    paramsSerializer: serializeRepeatKeyQuery,
  });
}

export const ResourceItemApi = {
  listResources,
  renameResource,
  changeResourceTags,
  changeResourceActionPermission,
  removeResources,
};

// /resource/tag/*
function getTagTree(req?: GetTagTreeApiRequest): Promise<GetTagTreeApiResponse> {
  return apiGet('/resource/tag/getTagTree', { params: req });
}

function addTag(req: AddTagApiRequest): Promise<string> {
  return apiPost('/resource/tag/addTag', req);
}

function changeTag(req: ChangeTagApiRequest): Promise<void> {
  return apiPost('/resource/tag/changeTag', req);
}

function removeTag(req: RemoveTagApiRequest): Promise<void> {
  return apiPost('/resource/tag/removeTag', req);
}

function moveTag(req: MoveTagApiRequest): Promise<void> {
  return apiPost('/resource/tag/moveTag', req);
}

export const ResourceTagApi = {
  getTagTree,
  addTag,
  changeTag,
  removeTag,
  moveTag,
};
