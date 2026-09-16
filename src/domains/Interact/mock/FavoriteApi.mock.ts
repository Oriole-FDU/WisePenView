import { mockResources } from '@/domains/Resource/mock/resourceStore';
import { mockPage, mockResponse } from '@/domains/_shared/mock/response';
import type { FavoriteApi as FavoriteApiContract } from '../apis/FavoriteApi';
import type {
  ChangeFavoriteStatusApiRequest,
  CreateCollectionApiRequest,
  DeleteCollectionApiRequest,
  FavoriteCollectionApiResponse,
  FavoriteItemApiResponse,
  ListFavoritedResourcesApiRequest,
  ListFavoritedResourcesApiResponse,
  UpdateCollectionInfoApiRequest,
} from '../apis/FavoriteApi.type';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const DEFAULT_COLLECTION_ID = 'mock-favorite-default';
const favoriteResourceIds = ['mock-note-1', 'mock-note-2', 'res-001', 'res-002'];

const collections: (FavoriteCollectionApiResponse & { collectionId: string; itemCount: number })[] =
  [
    {
      collectionId: DEFAULT_COLLECTION_ID,
      collectionName: null,
      description: null,
      isDefault: true,
      itemCount: 4,
    },
    {
      collectionId: 'mock-favorite-reading',
      collectionName: '稍后阅读',
      description: '需要继续跟进的资料',
      isDefault: false,
      itemCount: 2,
    },
  ];
const favoriteSeedTime = Date.now();
const resourceCollectionIds = new Map<string, string[]>(
  favoriteResourceIds.map(
    (resourceId, index) =>
      [
        resourceId,
        index % 2 === 0
          ? [DEFAULT_COLLECTION_ID]
          : [DEFAULT_COLLECTION_ID, 'mock-favorite-reading'],
      ] as const
  )
);
const resourceFavoriteTimes = new Map<string, number>(
  favoriteResourceIds.map(
    (resourceId, index) => [resourceId, favoriteSeedTime - index * 1000 * 60 * 60] as const
  )
);

const refreshCollectionCounts = () => {
  collections.forEach((collection) => {
    collection.itemCount = 0;
  });
  resourceCollectionIds.forEach((collectionIds) => {
    collectionIds.forEach((collectionId) => {
      const collection = collections.find((item) => item.collectionId === collectionId);
      if (collection) collection.itemCount += 1;
    });
  });
};

const getMockFavoriteCollectionIds = async (
  resourceId: string
): Promise<{ collectionIds: string[] }> => {
  await delay(80);
  return { collectionIds: [...(resourceCollectionIds.get(resourceId) ?? [])] };
};

const updateMockFavoriteCollections = async (
  params: ChangeFavoriteStatusApiRequest
): Promise<void> => {
  await delay(100);
  if (!params.favorite || params.collectionIds?.length === 0) {
    resourceCollectionIds.delete(params.resourceId);
    resourceFavoriteTimes.delete(params.resourceId);
  } else {
    const validIds = (params.collectionIds ?? [DEFAULT_COLLECTION_ID]).filter((collectionId) =>
      collections.some((collection) => collection.collectionId === collectionId)
    );
    if (validIds.length === 0) {
      resourceCollectionIds.delete(params.resourceId);
      resourceFavoriteTimes.delete(params.resourceId);
    } else {
      resourceCollectionIds.set(params.resourceId, Array.from(new Set(validIds)));
      resourceFavoriteTimes.set(params.resourceId, Date.now());
    }
  }
  refreshCollectionCounts();
};

const listMockFavoriteCollections = async () => {
  await delay(80);
  return collections.map((collection) => ({ ...collection }));
};

const createMockFavoriteCollection = async (
  params: CreateCollectionApiRequest
): Promise<string> => {
  await delay(100);
  const collectionId = `mock-favorite-${Date.now()}`;
  collections.push({
    collectionId,
    collectionName: params.collectionName,
    description: params.description ?? null,
    isDefault: false,
    itemCount: 0,
  });
  return collectionId;
};

const updateMockFavoriteCollection = async (
  params: UpdateCollectionInfoApiRequest
): Promise<void> => {
  await delay(100);
  const collection = collections.find((item) => item.collectionId === params.collectionId);
  if (!collection || collection.isDefault) return;
  collection.collectionName = params.collectionName;
  collection.description = params.description ?? null;
};

const deleteMockFavoriteCollection = async (params: DeleteCollectionApiRequest): Promise<void> => {
  await delay(100);
  const collection = collections.find((item) => item.collectionId === params.collectionId);
  if (!collection || collection.isDefault) return;
  const index = collections.indexOf(collection);
  collections.splice(index, 1);
  resourceCollectionIds.forEach((collectionIds, resourceId) => {
    const nextIds = collectionIds.filter((collectionId) => collectionId !== params.collectionId);
    if (params.keepResourcesToDefault && collectionIds.includes(params.collectionId)) {
      nextIds.push(DEFAULT_COLLECTION_ID);
    }
    const uniqueIds = Array.from(new Set(nextIds));
    if (uniqueIds.length === 0) {
      resourceCollectionIds.delete(resourceId);
      resourceFavoriteTimes.delete(resourceId);
    } else {
      resourceCollectionIds.set(resourceId, uniqueIds);
    }
  });
  refreshCollectionCounts();
};

const listMockFavoritedResources = async (
  params: ListFavoritedResourcesApiRequest
): Promise<ListFavoritedResourcesApiResponse> => {
  await delay(120);
  const list: FavoriteItemApiResponse[] = [...mockResources.values()]
    .filter((resource) => {
      const ids = resourceCollectionIds.get(resource.resourceId) ?? [];
      return params.collectionId ? ids.includes(params.collectionId) : ids.length > 0;
    })
    .map((resource) => ({
      resourceId: resource.resourceId,
      favoritedAt: resourceFavoriteTimes.get(resource.resourceId) ?? Date.now(),
      resourceInfo: resource,
    }))
    .sort((left, right) => Number(right.favoritedAt) - Number(left.favoritedAt));
  return mockResponse(mockPage(list, params));
};

export const FavoriteApi: typeof FavoriteApiContract = {
  getFavoriteStatus: getMockFavoriteCollectionIds,
  changeFavoriteStatus: updateMockFavoriteCollections,
  listCollections: listMockFavoriteCollections,
  createCollection: createMockFavoriteCollection,
  updateCollectionInfo: updateMockFavoriteCollection,
  deleteCollection: deleteMockFavoriteCollection,
  listFavoritedResources: listMockFavoritedResources,
};
