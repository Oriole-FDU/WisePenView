import type { ChatAgentOption } from '@/domains/Chat';

import type { ResourceChatProtocolPort } from './ResourceChatProtocol';

/** 面板布局：panel = 贴合窗口右缘的侧栏面板；page = 铺满内容区的整页模式 */
export type ChatPanelLayout = 'panel' | 'page';

export interface ChatPanelProps {
  fullWidth?: ChatPanelLayout;
  showHeader: boolean;
  resourceChat?: ResourceChatProtocolPort;
  agentDebug?: ChatPanelAgentDebugConfig;
  showCollapseButton?: boolean;
}

export interface ChatPanelAgentDebugConfig {
  agent: ChatAgentOption;
  isDirty: boolean;
  isSaving?: boolean;
  onSaveDraft: () => boolean | Promise<boolean>;
}
