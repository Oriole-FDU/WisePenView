import type { IResourceService, RenameResourceRequest } from '@/services/Resource';
import type { ResourceListPage } from '@/types/resource';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const resourceListPage = mockdata.resourceListPage as ResourceListPage;

const getUserResources = async (): Promise<ResourceListPage> => {
  await delay(200);
  return resourceListPage;
};

const getGroupResources = async (): Promise<ResourceListPage> => {
  await delay(200);
  return resourceListPage;
};

const renameResource = async (params: RenameResourceRequest): Promise<void> => {
  console.log('[ResourceServices.mock] renameResource', params);
  await delay(150);
};

const deleteResource = async (): Promise<void> => {
  await delay(150);
};

const updateResourcePath = async (): Promise<void> => {
  await delay(150);
};

const updateResourceTags = async (): Promise<void> => {
  await delay(150);
};

export const ResourceServicesMock: IResourceService = {
  getUserResources,
  getGroupResources,
  renameResource,
  deleteResource,
  updateResourcePath,
  updateResourceTags,
};
