import { apiPost } from '@/apis/request';
import type { InteractApiResponse, RateApiRequest, ToggleLikeApiRequest } from './InteractApi.type';

/** /resource/interact/* 子路由 API */
function toggleLike(req: ToggleLikeApiRequest): Promise<InteractApiResponse> {
  return apiPost('/resource/interact/toggleLike', req);
}

function rate(req: RateApiRequest): Promise<InteractApiResponse> {
  return apiPost('/resource/interact/rate', req);
}

export const ResourceInteractApi = { toggleLike, rate };
