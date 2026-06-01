export type { ResourceItem } from './entity/resource';
export { RESOURCE_SORT_BY, RESOURCE_SORT_DIR, RESOURCE_TYPE, TAG_QUERY_LOGIC_MODE } from './enum';
export type { ResourceSortBy, ResourceSortDir, TagQueryLogicMode } from './enum';
export type {
  GetGroupResourceRequest,
  GetUserResourcesRequest,
  IResourceService,
  InteractRateRequest,
  InteractRateResult,
  InteractToggleLikeRequest,
  InteractToggleLikeResult,
  RenameResourceRequest,
  ResourceListPage,
  UpdateResourceTagsRequest,
} from './service/index.type';
