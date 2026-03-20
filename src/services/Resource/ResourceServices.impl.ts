import type { ResourceListPage } from '@/types/resource';
import type {
  GetGroupResourceRequest,
  GetUserResourcesRequest,
  RenameResourceRequest,
  UpdateResourcePathRequest,
  UpdateResourceTagsRequest,
} from './index.type';
import { TAG_QUERY_LOGIC_MODE } from './index.type';
import type { IResourceService } from './index.type';
import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import type { ApiResponse } from '@/types/api';

/** GET query：数组用重复键，兼容 Spring @RequestParam List */
const serializeResourceListQuery = (params: Record<string, unknown>): string => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v !== undefined && v !== null && String(v) !== '') {
          sp.append(key, String(v));
        }
      });
    } else {
      sp.append(key, String(value));
    }
  });
  return sp.toString();
};

const requestResourceItemList = async (
  params: GetUserResourcesRequest,
  queryOverrides: Record<string, unknown> = {}
): Promise<ResourceListPage> => {
  const query: Record<string, unknown> = {
    page: params.page,
    size: params.size,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    tagQueryLogicMode: params.tagQueryLogicMode ?? TAG_QUERY_LOGIC_MODE.OR,
    ...queryOverrides,
  };
  if (params.resourceType != null && params.resourceType !== '') {
    query.resourceType = params.resourceType;
  }
  if (params.tagIds != null && params.tagIds.length > 0) {
    query.tagIds = params.tagIds;
  }
  const res = (await Axios.get('/resource/item/list', {
    params: query,
    paramsSerializer: serializeResourceListQuery,
  })) as ApiResponse<ResourceListPage>;
  checkResponse(res);
  const d = res.data;
  return {
    list: d?.list ?? [],
    total: d?.total ?? 0,
    page: d?.page ?? params.page,
    size: d?.size ?? params.size,
    totalPage: d?.totalPage ?? 0,
  };
};

const getUserResources = async (params: GetUserResourcesRequest): Promise<ResourceListPage> => {
  return requestResourceItemList(params);
};

const getGroupResources = async (params: GetGroupResourceRequest): Promise<ResourceListPage> => {
  return requestResourceItemList(params, { groupId: params.groupId });
};

const renameResource = async (params: RenameResourceRequest): Promise<void> => {
  const res = (await Axios.post('/resource/item/renameRes', params)) as ApiResponse;
  checkResponse(res);
};

const deleteResource = async (resourceId: string): Promise<void> => {
  const res = (await Axios.post('/internal/resource/deleteRes', null, {
    params: { resourceId },
  })) as ApiResponse;
  checkResponse(res);
};

/** 当前 resource.openapi.json 未收录「资源归属路径」变更接口，仍对接既有 /resource/move */
const updateResourcePath = async (params: UpdateResourcePathRequest): Promise<void> => {
  const res = (await Axios.post('/resource/move', params)) as ApiResponse;
  checkResponse(res);
};

const updateResourceTags = async (params: UpdateResourceTagsRequest): Promise<void> => {
  const res = (await Axios.post('/resource/item/updateTags', params)) as ApiResponse;
  checkResponse(res);
};

export const ResourceServicesImpl: IResourceService = {
  getUserResources,
  getGroupResources,
  renameResource,
  deleteResource,
  updateResourcePath,
  updateResourceTags,
};
