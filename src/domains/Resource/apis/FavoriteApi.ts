import { apiGet, apiPost } from '@/apis/request';
import type {
  ChangeFavoriteStatusApiRequest,
  CreateCollectionApiRequest,
  DeleteCollectionApiRequest,
  FavoriteCollectionApiResponse,
  GetFavoriteStatusApiResponse,
  ListFavoritedResourcesApiRequest,
  ListFavoritedResourcesApiResponse,
  UpdateCollectionInfoApiRequest,
} from './FavoriteApi.type';

/** 查询资源收藏状态 */
function getFavoriteStatus(resourceId: string): Promise<GetFavoriteStatusApiResponse> {
  return apiGet('/resource/favorite/getResourceFavoriteStatus', { params: { resourceId } });
}

/** 更改资源收藏状态，favorite=true 时 collectionIds 为全量替换语义 */
function changeFavoriteStatus(req: ChangeFavoriteStatusApiRequest): Promise<void> {
  return apiPost('/resource/favorite/changeResourceFavoriteStatus', req);
}

/** 获取当前用户的收藏集合列表 */
function listCollections(): Promise<FavoriteCollectionApiResponse[]> {
  return apiGet('/resource/favorite/listCollections');
}

/** 新建收藏集合，返回服务端生成的 collectionId */
function createCollection(req: CreateCollectionApiRequest): Promise<string> {
  return apiPost('/resource/favorite/createCollection', req);
}

/** 修改收藏集合名称或描述，collectionName 必传 */
function updateCollectionInfo(req: UpdateCollectionInfoApiRequest): Promise<void> {
  return apiPost('/resource/favorite/updateCollectionInfo', req);
}

/** 删除收藏集合 */
function deleteCollection(req: DeleteCollectionApiRequest): Promise<void> {
  return apiPost('/resource/favorite/deleteCollection', req);
}

/** 分页查询已收藏资源；不传 collectionId 为按内容视图 */
function listFavoritedResources(
  req: ListFavoritedResourcesApiRequest
): Promise<ListFavoritedResourcesApiResponse> {
  return apiGet('/resource/favorite/listFavoritedResources', { params: req });
}

export const FavoriteApi = {
  getFavoriteStatus,
  changeFavoriteStatus,
  listCollections,
  createCollection,
  updateCollectionInfo,
  deleteCollection,
  listFavoritedResources,
};
