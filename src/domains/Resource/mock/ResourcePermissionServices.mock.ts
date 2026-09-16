import type { IResourcePermissionService } from '@/domains/Resource';

import { createMockResourcePermissionOverview } from './resourcePermissionOverview.mockdata';

export const ResourcePermissionServicesMock: IResourcePermissionService = {
  async getResourcePermissionOverview(params) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return createMockResourcePermissionOverview(params);
  },
};
