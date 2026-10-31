import type { FavoriteCollection, FavoritedResourcesPage } from '../entity/favorite';

export interface IResourceFavoriteService {
  getFavoriteCollectionIds(resourceId: string): Promise<string[]>;
  updateFavoriteCollections(params: UpdateFavoriteCollectionsRequest): Promise<void>;
  listFavoriteCollections(): Promise<FavoriteCollection[]>;
  createFavoriteCollection(params: CreateFavoriteCollectionRequest): Promise<string>;
  updateFavoriteCollection(params: UpdateFavoriteCollectionRequest): Promise<void>;
  deleteFavoriteCollection(params: DeleteFavoriteCollectionRequest): Promise<void>;
  listFavoritedResources(params: ListFavoritedResourcesRequest): Promise<FavoritedResourcesPage>;
}

export interface UpdateFavoriteCollectionsRequest {
  resourceId: string;
  collectionIds: string[];
}

export interface CreateFavoriteCollectionRequest {
  collectionName: string;
  description?: string | null;
}

export interface UpdateFavoriteCollectionRequest {
  collectionId: string;
  collectionName: string;
  description?: string | null;
}

export interface DeleteFavoriteCollectionRequest {
  collectionId: string;
  keepResourcesToDefault?: boolean;
}

export interface ListFavoritedResourcesRequest {
  collectionId?: string;
  page: number;
  size: number;
}
