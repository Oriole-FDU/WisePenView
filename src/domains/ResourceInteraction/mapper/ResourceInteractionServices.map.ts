import type { GetUserInteractionRecordApiResponse } from '../apis/ResourceInteractionApi.schema';
import type { ResourceInteractionRecord } from '../entity/interaction';

const mapResourceInteractionRecordFromApi = (
  data: GetUserInteractionRecordApiResponse
): ResourceInteractionRecord => ({
  liked: data.liked,
  score: data.score ?? 0,
  likedCommentIds: new Set(data.likedCommentIds),
});

export const ResourceInteractionServicesMap = {
  mapResourceInteractionRecordFromApi,
};
