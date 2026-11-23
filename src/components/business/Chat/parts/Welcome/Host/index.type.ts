import type { ReactNode } from 'react';

import type { WelcomePromptPickMeta, WelcomeScreenConfig } from '../Starter/index.type';

export interface WelcomeScreenHostProps {
  /** 完整屏配置：hero（图标/文案）+ starter blocks（blocks 为空则仅 Title） */
  config: WelcomeScreenConfig;
  /** 默认按 config.hero 渲染 WelcomeTitle；传 ReactNode 可整体替换；传 null 关闭标题区 */
  hero?: ReactNode | null;
  /** 点选 starter；由装配方（如 Conversation）决定是否写入输入框 */
  onPromptPick?: (prompt: string, meta: WelcomePromptPickMeta) => void;
}
