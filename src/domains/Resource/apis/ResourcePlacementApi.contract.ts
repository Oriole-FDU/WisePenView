import { defineApiContract } from '@/apis/contract';

import {
  MountResourcesToGroupApiRequestSchema,
  MovePersonalResourcesToTrashApiRequestSchema,
  MoveResourcesInGroupApiRequestSchema,
  ReplacePersonalNormalTagsApiRequestSchema,
  ResourcePlacementApiResponseSchema,
  SetPersonalResourcesPathTagApiRequestSchema,
  UnmountResourcesToGroupApiRequestSchema,
} from './ResourcePlacementApi.schema';

export const SetPersonalResourcesPathTagApiContract = defineApiContract({
  name: 'SetPersonalResourcesPathTagApi',
  method: 'POST',
  endpoint: '/resource/placement/setPersonalResourcesPathTag',
  requestPlacement: 'body',
  transport: 'json',
  request: SetPersonalResourcesPathTagApiRequestSchema,
  response: ResourcePlacementApiResponseSchema,
});

export const MovePersonalResourcesToTrashApiContract = defineApiContract({
  name: 'MovePersonalResourcesToTrashApi',
  method: 'POST',
  endpoint: '/resource/placement/movePersonalResourcesToTrash',
  requestPlacement: 'body',
  transport: 'json',
  request: MovePersonalResourcesToTrashApiRequestSchema,
  response: ResourcePlacementApiResponseSchema,
});

export const ReplacePersonalNormalTagsApiContract = defineApiContract({
  name: 'ReplacePersonalNormalTagsApi',
  method: 'POST',
  endpoint: '/resource/placement/replacePersonalNormalTags',
  requestPlacement: 'body',
  transport: 'json',
  request: ReplacePersonalNormalTagsApiRequestSchema,
  response: ResourcePlacementApiResponseSchema,
});

export const MountResourcesToGroupApiContract = defineApiContract({
  name: 'MountResourcesToGroupApi',
  method: 'POST',
  endpoint: '/resource/placement/mountResourcesToGroup',
  requestPlacement: 'body',
  transport: 'json',
  request: MountResourcesToGroupApiRequestSchema,
  response: ResourcePlacementApiResponseSchema,
});

export const UnmountResourcesToGroupApiContract = defineApiContract({
  name: 'UnmountResourcesToGroupApi',
  method: 'POST',
  endpoint: '/resource/placement/unmountResourcesToGroup',
  requestPlacement: 'body',
  transport: 'json',
  request: UnmountResourcesToGroupApiRequestSchema,
  response: ResourcePlacementApiResponseSchema,
});

export const MoveResourcesInGroupApiContract = defineApiContract({
  name: 'MoveResourcesInGroupApi',
  method: 'POST',
  endpoint: '/resource/placement/moveResourcesInGroup',
  requestPlacement: 'body',
  transport: 'json',
  request: MoveResourcesInGroupApiRequestSchema,
  response: ResourcePlacementApiResponseSchema,
});
