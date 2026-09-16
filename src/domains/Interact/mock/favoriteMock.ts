import type {
  CreateFavoriteCollectionRequest,
  DeleteFavoriteCollectionRequest,
  FavoriteCollection,
  FavoritedResourcesPage,
  FavoriteItem,
  ListFavoritedResourcesRequest,
  UpdateFavoriteCollectionRequest,
  UpdateFavoriteCollectionsRequest,
} from '@/domains/Interact';
import type { ResourceItem } from '@/domains/Resource';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const DEFAULT_COLLECTION_ID = 'mock-favorite-default';
const mockFavoriteResources: ResourceItem[] = [
  {
    resourceId: 'mock-note-1',
    resourceName: '第一份 Mock 笔记',
    ownerId: '1',
    ownerInfo: {},
    resourceType: 'NOTE',
    resourceIconType: 'note',
  },
  {
    resourceId: 'mock-note-2',
    resourceName: '第二份 Mock 笔记',
    ownerId: '1',
    ownerInfo: {},
    resourceType: 'NOTE',
    resourceIconType: 'note',
  },
  {
    resourceId: 'res-001',
    resourceName: '示例文档.pdf',
    ownerId: '1',
    ownerInfo: {},
    resourceType: 'pdf',
    resourceIconType: 'pdf',
  },
  {
    resourceId: 'res-002',
    resourceName: '项目说明.md',
    ownerId: '1',
    ownerInfo: {},
    resourceType: 'md',
    resourceIconType: 'md',
  },
];

const collections: FavoriteCollection[] = [
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
  mockFavoriteResources.map(
    (resource, index) =>
      [
        resource.resourceId,
        index % 2 === 0
          ? [DEFAULT_COLLECTION_ID]
          : [DEFAULT_COLLECTION_ID, 'mock-favorite-reading'],
      ] as const
  )
);
const resourceFavoriteTimes = new Map<string, number>(
  mockFavoriteResources.map(
    (resource, index) => [resource.resourceId, favoriteSeedTime - index * 1000 * 60 * 60] as const
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

export const getMockFavoriteCollectionIds = async (resourceId: string): Promise<string[]> => {
  await delay(80);
  return [...(resourceCollectionIds.get(resourceId) ?? [])];
};

export const updateMockFavoriteCollections = async (
  params: UpdateFavoriteCollectionsRequest
): Promise<void> => {
  await delay(100);
  if (params.collectionIds.length === 0) {
    resourceCollectionIds.delete(params.resourceId);
    resourceFavoriteTimes.delete(params.resourceId);
  } else {
    const validIds = params.collectionIds.filter((collectionId) =>
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

export const listMockFavoriteCollections = async () => {
  await delay(80);
  return collections.map((collection) => ({ ...collection }));
};

export const createMockFavoriteCollection = async (
  params: CreateFavoriteCollectionRequest
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

export const updateMockFavoriteCollection = async (
  params: UpdateFavoriteCollectionRequest
): Promise<void> => {
  await delay(100);
  const collection = collections.find((item) => item.collectionId === params.collectionId);
  if (!collection || collection.isDefault) return;
  collection.collectionName = params.collectionName;
  collection.description = params.description ?? null;
};

export const deleteMockFavoriteCollection = async (
  params: DeleteFavoriteCollectionRequest
): Promise<void> => {
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

export const listMockFavoritedResources = async (
  params: ListFavoritedResourcesRequest
): Promise<FavoritedResourcesPage> => {
  await delay(120);
  const list: FavoriteItem[] = mockFavoriteResources
    .filter((resource) => {
      const ids = resourceCollectionIds.get(resource.resourceId) ?? [];
      return params.collectionId ? ids.includes(params.collectionId) : ids.length > 0;
    })
    .map((resource) => ({
      resourceId: resource.resourceId,
      favoritedAt: resourceFavoriteTimes.get(resource.resourceId) ?? Date.now(),
      resourceInfo: resource,
    }))
    .sort((left, right) => right.favoritedAt - left.favoritedAt);
  const total = list.length;
  const totalPage = Math.max(1, Math.ceil(total / params.size));
  const start = (params.page - 1) * params.size;
  return {
    list: list.slice(start, start + params.size),
    total,
    totalPage,
  };
};
