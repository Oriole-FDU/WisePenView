import {
  mapListResourceItemsRequest,
  mapMountResourcesToGroupRequest,
  mapMovePersonalResourcesToTrashRequest,
  mapMoveResourcesInGroupRequest,
  mapReplacePersonalNormalTagsRequest,
  mapResourceItemFromApi,
  mapResourceListPageFromApi,
  mapResourcePlacementCountFromApi,
  mapSearchResultPageFromApi,
  mapSetPersonalResourcesPathTagRequest,
  mapUnmountResourcesToGroupRequest,
} from './resource.mapper';
import {
  mapChangeResourceActionPermissionRequest,
  mapChangeResourceActionPermissionRequestFromSubjects,
  mapResourcePermissionOverviewFromApi,
} from './resourcePermission.mapper';
import { mergeResourcePermissionHydration } from './resourcePermissionHydration.mapper';

export const ResourceServicesMap = {
  mapListResourceItemsRequest,
  mapSetPersonalResourcesPathTagRequest,
  mapMovePersonalResourcesToTrashRequest,
  mapReplacePersonalNormalTagsRequest,
  mapMountResourcesToGroupRequest,
  mapUnmountResourcesToGroupRequest,
  mapMoveResourcesInGroupRequest,
  mapResourcePlacementCountFromApi,
  mapResourceListPageFromApi,
  mapResourceItemFromApi,
  mapChangeResourceActionPermissionRequest,
  mapChangeResourceActionPermissionRequestFromSubjects,
  mapResourcePermissionOverviewFromApi,
  mergeResourcePermissionHydration,
  mapSearchResultPageFromApi,
};
