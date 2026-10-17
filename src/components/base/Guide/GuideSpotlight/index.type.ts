import type { GuideSpotlightPadding, GuideToolId } from '@/constants/tour';

export interface GuideSpotlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
  /** 已包含孔洞 padding 的外圈圆角。 */
  radius: number;
}

export interface GuideSpotlightFrame {
  width: number;
  height: number;
  rects: GuideSpotlightRect[];
}

export interface GuideSpotlightProps {
  toolIds: readonly GuideToolId[];
  /** 覆盖默认的高亮孔 padding。 */
  padding?: GuideSpotlightPadding;
  /** 覆盖默认的聚光孔圆角。 */
  radius?: number;
  zIndex: number;
}
