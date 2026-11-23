import type { WisePenUIMessage } from '@/domains/ChatSession';

export interface UserMessageProps {
  message: WisePenUIMessage;
  fullWidth: boolean;
}
