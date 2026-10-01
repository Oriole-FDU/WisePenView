import type { useChatSessionController } from '../_controllers/useChatSessionController';
import type { useChatTurnController } from '../_controllers/useChatTurnController';
import type { SendOptions } from '../ChatInput/index.type';
import type { ChatPanelAgentDebugConfig } from '../index.type';

export interface ChatPanelConversationProps {
  /** 对话域：消息、运行状态、历史分页与取消；由对话区按需解包 */
  turn: ReturnType<typeof useChatTurnController>;
  /** 会话域：当前会话身份、会话列表浮层与新建会话；由对话区按需解包 */
  session: ReturnType<typeof useChatSessionController>;
  agentDebug?: ChatPanelAgentDebugConfig;
  fullWidth: boolean;
  contextPreview?: string;
  onClearContext?: () => void;
  /** 发送入口由顶层组合：登录校验、调试域拦截后再落到对话域 */
  onSend: (text: string, opts?: SendOptions) => boolean | void | Promise<boolean | void>;
}
