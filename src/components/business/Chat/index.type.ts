import type { ChatAgentOption } from '@/domains/Chat';

import type { SendOptions } from './send.type';

/** 面板布局：panel = 贴合窗口右缘的侧栏面板；page = 铺满内容区的整页模式 */
export type ChatLayout = 'panel' | 'page';

/**
 * 发送前置守卫：返回 Promise 表示本次发送被挂起，由守卫方决定是否继续发送；
 * 返回 null 表示不拦截，调用方直接发送。
 */
export type ChatSendInterceptor = (text: string, opts?: SendOptions) => Promise<boolean> | null;

/**
 * 宿主 Agent 端口：宿主（如资源编辑器）借聊天面板挂载自己的 Agent 与发送时机。
 * 面板只按端口转发能力，不感知宿主的草稿、保存和权限语义。
 */
export interface ChatHostAgentPort {
  /** 追加到输入区 Agent 选择器的选项 */
  injectedAgents?: ChatAgentOption[];
  /** 输入区首选 Agent，仅在宿主希望接管默认选择时提供 */
  preferredAgent?: ChatAgentOption | null;
  /** 发送前置守卫，命中时由宿主决定本次发送是否继续 */
  interceptSend?: ChatSendInterceptor;
}

export interface ChatProps {
  resourceId?: string;
  fullWidth?: ChatLayout;
  showHeader: boolean;
  resourceChat?: {
    provider?: {
      key: string;
      getBlockedReason?: () => string | undefined;
      onDemandSkillIds?: readonly string[];
    };
    context?: { providerKey: string };
    clearContext: (context?: { providerKey: string }) => void;
  };
  /** 宿主注入的 Agent 端口，面板只做转发 */
  hostAgentPort?: ChatHostAgentPort;
  showCollapseButton?: boolean;
}
