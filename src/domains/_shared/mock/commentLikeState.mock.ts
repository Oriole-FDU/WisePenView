const likedCommentIdsByResource = new Map<string, Set<string>>();

const getState = (resourceId: string): Set<string> => {
  const existing = likedCommentIdsByResource.get(resourceId);
  if (existing) return existing;
  const created = new Set<string>();
  likedCommentIdsByResource.set(resourceId, created);
  return created;
};

export const ensureMockCommentLikeIds = (resourceId: string, commentIds: string[]): void => {
  const state = getState(resourceId);
  commentIds.forEach((commentId) => state.add(commentId));
};

export const getMockCommentLikeIds = (resourceId: string): ReadonlySet<string> =>
  new Set(getState(resourceId));

export const toggleMockCommentLike = (resourceId: string, commentId: string): boolean => {
  const state = getState(resourceId);
  if (state.has(commentId)) {
    state.delete(commentId);
    return false;
  }
  state.add(commentId);
  return true;
};
