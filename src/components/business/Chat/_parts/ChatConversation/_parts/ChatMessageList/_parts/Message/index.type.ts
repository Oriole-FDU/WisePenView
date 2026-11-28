import type { ChatModel } from '@/domains/ChatConfig';
import type { WisePenUIMessage } from '@/domains/ChatSession';

export interface MessageProps {
  message: WisePenUIMessage;
  model: ChatModel | null;
  streaming: boolean;
  fullWidth: boolean;
}
