export interface ResourceInteractFooterProps {
  /** 当前用户是否已点赞 */
  liked?: boolean;
  /** 当前用户评分（1-5），null = 未评分 */
  userScore?: number | null;
  /** 点赞 / 取消点赞回调 */
  onToggleLike?: () => void;
  /** 评分提交回调（选星即触发，1-5） */
  onRate?: (score: number) => void;
  likeLoading?: boolean;
  rateLoading?: boolean;
}
