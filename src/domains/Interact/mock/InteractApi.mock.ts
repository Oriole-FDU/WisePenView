import { mockResponse } from '@/domains/_shared/mock/response';
import { getMockResource } from '@/domains/Resource/mock/resourceStore';
import type { InteractApi as InteractApiContract } from '../apis/InteractApi';
import { getMockCommentLikeIds } from './CommentApi.mock';

export const InteractApi: typeof InteractApiContract = {
  getUserInteractionRecord: ({ resourceId }) =>
    mockResponse({
      ...getMockResource(resourceId).myInteractionRecord,
      likedCommentIds: [...getMockCommentLikeIds(resourceId)],
    }),
  setLike: async ({ resourceId, liked }) => {
    (getMockResource(resourceId).myInteractionRecord ??= {}).liked = liked;
  },
  rate: async ({ resourceId, score }) => {
    (getMockResource(resourceId).myInteractionRecord ??= {}).score = score;
  },
  read: async ({ resourceId }) => {
    (getMockResource(resourceId).myInteractionRecord ??= {}).read = true;
  },
};
