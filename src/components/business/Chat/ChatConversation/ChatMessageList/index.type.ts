import type { ChatModel } from '@/domains/ChatConfig';
import type { WisePenUIMessage } from '@/domains/ChatTurn';

export interface ChatMessageListProps {
  messages: readonly WisePenUIMessage[];
  resetKey?: string;
  generating: boolean;
  canLoadMoreHistory: boolean;
  loadingInitialHistory: boolean;
  loadingMoreHistory: boolean;
  onLoadMoreHistory: () => Promise<void>;
  model: ChatModel | null;
  fullWidth: boolean;
}
