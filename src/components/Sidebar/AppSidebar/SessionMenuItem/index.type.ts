import type { ChatSession } from '@/domains/Chat';

export interface SessionMenuItemProps {
  session: ChatSession;
  onUpdated: () => Promise<void>;
  onDeleted: (sessionId: string) => void;
}
