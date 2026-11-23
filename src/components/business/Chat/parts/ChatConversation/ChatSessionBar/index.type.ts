import type { ChatSession } from '@/domains/ChatSession';

export interface ChatSessionBarProps {
  activeSessionId?: string | null;
  onClose: () => void;
  onSelectSession: (session: ChatSession) => void;
}
