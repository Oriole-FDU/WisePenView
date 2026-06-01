/** 顶部互动信息展示条（只读） */
export interface ResourceInteractBarProps {
  /** undefined 时不渲染该区块 */
  readCount?: number | null;
  /** 总点赞数（含乐观更新后的展示值） */
  likeCount?: number | null;
  /** 平均评分，null = 暂无评分（不得展示 0.0） */
  scoreAvg?: number | null;
}
