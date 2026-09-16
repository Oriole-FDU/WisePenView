import { apiGet, apiPost } from '@/apis/request';

import type {
  GetUserInteractionRecordApiResponse,
  RateApiRequest,
  ResourceInteractionApiRequest,
  ResourceLikeApiRequest,
} from './InteractApi.type';

/** /resource/interaction/* 子路由 API */
function setLike(req: ResourceLikeApiRequest): Promise<void> {
  return apiPost('/resource/interaction/toggleLike', req);
}

function rate(req: RateApiRequest): Promise<void> {
  return apiPost('/resource/interaction/rate', req);
}

function read(req: ResourceInteractionApiRequest): Promise<void> {
  return apiPost('/resource/interaction/read', req);
}

function getUserInteractionRecord(
  req: ResourceInteractionApiRequest
): Promise<GetUserInteractionRecordApiResponse> {
  return apiGet('/resource/interaction/getResourceUserInteractionRecord', { params: req });
}

export const InteractApi = { setLike, rate, read, getUserInteractionRecord };
