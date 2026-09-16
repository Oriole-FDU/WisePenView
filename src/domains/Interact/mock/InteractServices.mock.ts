import type {
  IInteractService,
  RateResourceRequest,
  ResourceInteractionRecord,
} from '@/domains/Interact';

import {
  createMockComment,
  createMockReply,
  deleteMockComment,
  getMockCommentLikeIds,
  listMockComments,
  listMockReplies,
  toggleMockCommentLike,
} from './commentMock';
import {
  createMockFavoriteCollection,
  deleteMockFavoriteCollection,
  getMockFavoriteCollectionIds,
  listMockFavoriteCollections,
  listMockFavoritedResources,
  updateMockFavoriteCollection,
  updateMockFavoriteCollections,
} from './favoriteMock';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const interactionByResource = new Map<string, { liked: boolean; score: number }>();

function getInteractionState(resourceId: string) {
  const existing = interactionByResource.get(resourceId);
  if (existing) return existing;
  const state = { liked: false, score: 0 };
  interactionByResource.set(resourceId, state);
  return state;
}

async function getResourceInteraction(resourceId: string): Promise<ResourceInteractionRecord> {
  await delay(100);
  const state = getInteractionState(resourceId);
  return { ...state, likedCommentIds: getMockCommentLikeIds(resourceId) };
}

async function setResourceLike(resourceId: string, liked: boolean): Promise<void> {
  await delay(100);
  getInteractionState(resourceId).liked = liked;
}

async function rateResource(params: RateResourceRequest): Promise<void> {
  await delay(100);
  getInteractionState(params.resourceId).score = params.score;
}

async function recordResourceRead(): Promise<void> {
  await delay(50);
}

export const InteractServicesMock: IInteractService = {
  getResourceInteraction,
  setResourceLike,
  rateResource,
  recordResourceRead,
  listComments: listMockComments,
  listReplies: listMockReplies,
  createComment: createMockComment,
  createReply: createMockReply,
  deleteComment: deleteMockComment,
  toggleCommentLike: toggleMockCommentLike,
  getFavoriteCollectionIds: getMockFavoriteCollectionIds,
  updateFavoriteCollections: updateMockFavoriteCollections,
  listFavoriteCollections: listMockFavoriteCollections,
  createFavoriteCollection: createMockFavoriteCollection,
  updateFavoriteCollection: updateMockFavoriteCollection,
  deleteFavoriteCollection: deleteMockFavoriteCollection,
  listFavoritedResources: listMockFavoritedResources,
};
