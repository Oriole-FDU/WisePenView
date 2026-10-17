import type { Placement } from 'react-joyride';

import type { GuideActionId } from './actions';
import type { GuideToolId } from './toolId';

export type GuideStepPlacement = Placement | 'center' | 'auto';

/** 高亮孔相对目标四边外扩的距离；未填写的方向使用组件默认值。 */
export interface GuideSpotlightPadding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

/** 一条可配置的新手指引步骤。文案使用 tour namespace 下的 i18n key。 */
export interface GuideStepConfig {
  id: string;
  toolId: GuideToolId;
  titleKey: string;
  contentKey: string;
  placement?: GuideStepPlacement;
  /** 展示前由宿主改界面状态，例如展开对话。 */
  prepare?: GuideActionId;
  /** 离开这一步时收回 prepare 打开的界面。 */
  restore?: GuideActionId;
  /** 优先用给定方位。这一侧会伸出窗口时改到对面。 */
  preventFlip?: boolean;
  /** 气泡与目标的间距。紧贴输入框时用 0。 */
  offset?: number;
  /** 指定气泡宽度；用于空间较窄、需要固定单侧展示的步骤。 */
  tooltipWidth?: string;
  /** 额外需要同时高亮的区域。一步有多个目标时由引导层合并绘制。 */
  spotlightToolIds?: readonly GuideToolId[];
  /** 覆盖这一步的高亮孔 padding；用于让高亮范围在分割线等边界前收住。 */
  spotlightPadding?: GuideSpotlightPadding;
  /** 聚光孔圆角；默认跟随锚点自身圆角并叠加外扩距离。 */
  spotlightRadius?: number;
}

export interface GuideTourConfig {
  steps: readonly GuideStepConfig[];
}

export type GuideTourId = 'sidebar' | 'chat' | 'note' | 'drive' | 'courseResources';
