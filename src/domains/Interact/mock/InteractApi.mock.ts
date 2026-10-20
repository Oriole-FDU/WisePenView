import { mockResponse } from '@/domains/_shared/mock/response';
import { getMockInteractionRecord } from '@/domains/Resource/mock/resourceStore';

import type { InteractApi as InteractApiContract } from '../apis/InteractApi';
import { getMockCommentLikeIds } from './CommentApi.mock';

export const InteractApi: typeof InteractApiContract = {
  getUserInteractionRecord: ({ resourceId }) =>
    mockResponse({
      ...getMockInteractionRecord(resourceId),
      likedCommentIds: [...getMockCommentLikeIds(resourceId)],
    }),
  setLike: async ({ resourceId, liked }) => {
    getMockInteractionRecord(resourceId).liked = liked;
  },
  rate: async ({ resourceId, score }) => {
    getMockInteractionRecord(resourceId).score = score;
  },
  read: async ({ resourceId }) => {
    getMockInteractionRecord(resourceId).read = true;
  },
};
