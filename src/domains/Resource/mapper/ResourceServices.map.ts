import {
  mapListResourceItemsRequest,
  mapResourceItemFromApi,
  mapResourceListPageFromApi,
  mapResourcePlacementCountFromApi,
  mapSearchResultPageFromApi,
} from './resource.mapper';
import {
  mapChangeResourceActionPermissionRequest,
  mapChangeResourceActionPermissionRequestFromSubjects,
  mapResourcePermissionOverviewFromApi,
} from './resourcePermission.mapper';
import { mergeResourcePermissionHydration } from './resourcePermissionHydration.mapper';

export const ResourceServicesMap = {
  mapListResourceItemsRequest,
  mapResourcePlacementCountFromApi,
  mapResourceListPageFromApi,
  mapResourceItemFromApi,
  mapChangeResourceActionPermissionRequest,
  mapChangeResourceActionPermissionRequestFromSubjects,
  mapResourcePermissionOverviewFromApi,
  mergeResourcePermissionHydration,
  mapSearchResultPageFromApi,
};
