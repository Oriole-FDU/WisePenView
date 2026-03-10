import type { ResourceListPage } from '@/types/resource';
import type {
  GetUserResourcesRequest,
  RenameResourceRequest,
  UpdateResourceTagsRequest,
} from './index.type';

const getUserResources = async (
  params: GetUserResourcesRequest
): Promise<ResourceListPage> => {
  return {
    list: [],
    total: 0,
    page: params.page,
    size: params.size,
    totalPage: 0,
  };
};

const renameResource = async (
  _params: RenameResourceRequest
): Promise<void> => {};

const deleteResource = async (_resourceId: string): Promise<void> => {};

const updateResourceTags = async (
  _params: UpdateResourceTagsRequest
): Promise<void> => {};

export const ResourceServices = {
  getUserResources,
  renameResource,
  deleteResource,
  updateResourceTags,
};
