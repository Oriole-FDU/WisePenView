import type { ReactNode } from 'react';

export interface ChatDockLayoutProps {
  /** 左侧内容：资源视图或课程学习区 */
  left: ReactNode;
  /** 右侧对话面板 */
  right: ReactNode;
  /** 左侧内容最小宽度 */
  leftMinWidth: number;
  /** 对话面板与窄屏 overlay 的无障碍名称 */
  chatLabel: string;
  /** 面板 id，用于区分不同页面的 dock */
  panelId?: string;
  /** 根容器扩展类名，用于页面级样式（如聊天打开时放宽宽度） */
  className?: string;
}
