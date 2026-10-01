import type { ChatModel, WisePenUIMessage } from '@/domains/Chat';

/** 消息展示契约；会话身份、消息写入与审批编排由调用方维护。 */
export interface ChatMessageListProps {
  messages: readonly WisePenUIMessage[];
  /** 仅重置滚动跟随状态，不解析或维护会话身份。 */
  resetKey?: string;
  generating: boolean;
  canLoadMoreHistory: boolean;
  loadingInitialHistory: boolean;
  loadingMoreHistory: boolean;
  onLoadMoreHistory: () => Promise<void>;
  model: ChatModel | null;
  fullWidth: boolean;
}
