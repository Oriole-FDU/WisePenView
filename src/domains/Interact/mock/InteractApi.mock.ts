import { mockResponse } from '@/domains/_shared/mock/response';
import { getMockResource } from '@/domains/Resource/mock/resourceStore';

import type { InteractApi as InteractApiContract } from '../apis/InteractApi';
import { getMockCommentLikeIds } from './CommentApi.mock';

export const InteractApi: typeof InteractApiContract = {
  getUserInteractionRecord: ({ resourceId }) =>
    mockResponse({
      ...(getMockResource(resourceId).myInteractionRecord ?? {
        read: false,
        liked: false,
        score: null,
        likedCommentIds: [],
        resourceId,
      }),
      likedCommentIds: [...getMockCommentLikeIds(resourceId)],
    }),
  setLike: async ({ resourceId }) => {
    const record = (getMockResource(resourceId).myInteractionRecord ??= {
      read: false,
      liked: false,
      score: null,
      likedCommentIds: [],
      resourceId,
    });
    record.liked = !record.liked;
  },
  rate: async ({ resourceId, score }) => {
    (getMockResource(resourceId).myInteractionRecord ??= {
      read: false,
      liked: false,
      score: null,
      likedCommentIds: [],
      resourceId,
    }).score = score;
  },
  read: async ({ resourceId }) => {
    (getMockResource(resourceId).myInteractionRecord ??= {
      read: false,
      liked: false,
      score: null,
      likedCommentIds: [],
      resourceId,
    }).read = true;
  },
};
