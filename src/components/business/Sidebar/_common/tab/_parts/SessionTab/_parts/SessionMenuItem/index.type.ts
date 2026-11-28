import type { ChatSession } from '@/domains/ChatSession';

export interface SessionMenuItemProps {
  session: ChatSession;
  onUpdated: () => Promise<void>;
  onDeleted: (sessionId: string) => void;
}
