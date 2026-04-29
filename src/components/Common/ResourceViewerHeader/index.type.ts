import type { ReactNode } from 'react';

export interface ResourceViewerHeaderProps {
  /** 返回目标路由，默认云盘 */
  backTo?: string;
  /** 返回链接文案 */
  backLabel?: string;
  /** 工具条中间区：如 PDF 图标 + 文件名 */
  inlineTitle?: ReactNode;
  /** 有值时展示「上次编辑」标签与文案 */
  lastEditedAtText?: string;
  /** 右侧操作区（分享等） */
  extra?: ReactNode;
  /** 工具条下方整块区域，如笔记可编辑标题 */
  titleBlock?: ReactNode;
  className?: string;
}
