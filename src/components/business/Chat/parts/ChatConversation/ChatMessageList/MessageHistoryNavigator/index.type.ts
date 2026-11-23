import type { WisePenUIMessage } from '@/domains/ChatSession';

export interface MessageHistoryNavigatorProps {
  messages: readonly WisePenUIMessage[];
  scrollAnchorOffsetRatio: number;
}
