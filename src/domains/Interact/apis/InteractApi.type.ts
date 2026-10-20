import type { Nullable } from '@/apis/api.type';

/** 资源交互接口的公共请求体 */
export interface ResourceInteractionApiRequest {
  resourceId: string;
}

/** POST /resource/interaction/toggleLike 请求体 */
export interface ResourceLikeApiRequest extends ResourceInteractionApiRequest {
  liked: boolean;
}

/** POST /resource/interaction/rate 请求体 */
export interface RateApiRequest extends ResourceInteractionApiRequest {
  /** 1–5 整数 */
  score: number;
}

/** GET /resource/interaction/getResourceUserInteractionRecord 响应体 */
export interface GetUserInteractionRecordApiResponse {
  resourceId: string;
  /** 是否已点赞 */
  read: boolean;
  /** 是否已点赞 */
  liked: boolean;
  /** 用户评分 1-5；未评分则为 null */
  score: Nullable<number>;
  /** 当前用户已点赞的评论/回复 ID */
  likedCommentIds: string[];
}
