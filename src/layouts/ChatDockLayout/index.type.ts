import type { ReactNode } from 'react';

export interface ChatDockLayoutProps {
  /** 主内容区，占据 dock 之外的全部宽度 */
  children: ReactNode;
  /** 对话面板；由调用方装配，布局只决定它与主内容的关系 */
  chat: ReactNode;
  /** 对话面板与窄屏 overlay 的无障碍名称 */
  chatLabel: string;
  /** 主内容区最小宽度 */
  mainMinWidth: number;
  /** 面板 id，用于区分不同页面的 dock */
  panelId?: string;
  /** 根容器扩展类名，用于页面级样式（如聊天打开时放宽宽度） */
  className?: string;
}
