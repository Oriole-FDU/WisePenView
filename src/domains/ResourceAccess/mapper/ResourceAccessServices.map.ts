import {
  mapChangeResourceActionPermissionRequest,
  mapChangeResourceActionPermissionRequestFromSubjects,
  mapResourcePermissionOverviewFromApi,
} from './resourcePermission.mapper';
import { mergeResourcePermissionHydration } from './resourcePermissionHydration.mapper';

export const ResourceAccessServicesMap = {
  mapChangeResourceActionPermissionRequest,
  mapChangeResourceActionPermissionRequestFromSubjects,
  mapResourcePermissionOverviewFromApi,
  mergeResourcePermissionHydration,
};
