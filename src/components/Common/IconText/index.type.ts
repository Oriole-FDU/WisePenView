import type { CSSProperties, ElementType, ReactNode, Ref } from 'react';

export type IconTextIconPosition = 'start' | 'end';

export type IconTextAlign = 'center' | 'baseline';

export interface IconTextBaseProps {
  /** 图标节点，支持 lucide-react、antd icon、自定义 svg 或图片。 */
  icon?: ReactNode;
  /** 文本或任意 inline 内容。 */
  children?: ReactNode;
  /** 根节点类型。默认 span，适合嵌入 button、menu item、文字流。 */
  as?: ElementType;
  /** 图标位于文字左侧或右侧。 */
  iconPosition?: IconTextIconPosition;
  /** 图标槽尺寸。数字会转换为 px；默认 1em，跟随当前字号。 */
  iconSize?: CSSProperties['width'];
  /** 图标与文本间距。数字会转换为 px；默认 0.5em。 */
  gap?: CSSProperties['gap'];
  /** 单行图文默认收紧 line box，避免继承较大行高导致视觉中心漂移。 */
  lineHeight?: CSSProperties['lineHeight'];
  /** 图标垂直光学校正。正值向下，负值向上。 */
  iconOffsetY?: CSSProperties['translate'];
  /** 文本垂直光学校正。正值向下，负值向上。 */
  textOffsetY?: CSSProperties['translate'];
  /** center 用于单行控件；baseline 用于需要贴近文本基线的正文场景。 */
  align?: IconTextAlign;
  /** 是否允许文本换行。默认 false，保证按钮、菜单项中的单行稳定性。 */
  wrap?: boolean;
  /** 是否对单行文本做省略。需要外层或自身有宽度约束。 */
  ellipsis?: boolean;
  /** 根节点是否占满父级宽度。常用于 MenuItem、列表项。 */
  block?: boolean;
  /** 额外 className。 */
  className?: string;
  /** 根节点行内样式，可用于接设计 token 或局部微调。 */
  style?: CSSProperties;
  /** 图标槽额外 className。 */
  iconClassName?: string;
  /** 文本槽额外 className。 */
  textClassName?: string;
  /** 根节点 ref。 */
  ref?: Ref<HTMLElement>;
}

export type IconTextProps = IconTextBaseProps &
  Omit<React.HTMLAttributes<HTMLElement>, keyof IconTextBaseProps>;
