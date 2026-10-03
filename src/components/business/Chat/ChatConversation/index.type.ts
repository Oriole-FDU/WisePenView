import type { ChatAgentOption } from '@/domains/Chat';

import type { useChatSessionController } from '../_controllers/useChatSessionController';
import type { useChatTurnController } from '../_controllers/useChatTurnController';
import type { SendOptions } from '../send.type';

export interface ChatConversationProps {
  /** 对话域：消息、运行状态、历史分页与取消；由对话区按需解包 */
  turn: ReturnType<typeof useChatTurnController>;
  /** 会话域：当前会话身份、会话列表浮层与新建会话；由对话区按需解包 */
  session: ReturnType<typeof useChatSessionController>;
  /** 输入区 Agent 选择器的额外选项与首选 Agent */
  injectedAgents?: ChatAgentOption[];
  preferredAgent?: ChatAgentOption | null;
  fullWidth: boolean;
  contextPreview?: string;
  onClearContext?: () => void;
  /** 发送入口由顶层组合：登录校验、宿主守卫后再落到对话域 */
  onSend: (text: string, opts?: SendOptions) => boolean | void | Promise<boolean | void>;
}
