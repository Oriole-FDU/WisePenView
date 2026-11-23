import type { WisePenUIMessage } from '@/domains/ChatSession';

export interface StreamingScrollFollowerProps {
  active: boolean;
  messages: readonly WisePenUIMessage[];
}
