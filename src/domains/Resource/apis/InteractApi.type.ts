/** POST /resource/interact/toggleLike 请求体 */
export interface ToggleLikeApiRequest {
  resourceId: string;
}

/** POST /resource/interact/rate 请求体 */
export interface RateApiRequest {
  resourceId: string;
  /** 1–5 整数 */
  score: number;
}

/** toggleLike / rate 共用响应结构（`data` 字段内容） */
export interface InteractApiResponse {
  resourceId: string;
  /** 操作后的最新点赞状态 */
  liked: boolean;
  /** 点赞接口固定返回 null；前端应乐观更新本地值 */
  likeCount: null;
  /** 评分接口返回最新 userScore；点赞接口固定返回 null */
  userScore: number | null;
}
