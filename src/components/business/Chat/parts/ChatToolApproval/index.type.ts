import type { WisePenUIMessage } from '@/domains/ChatSession';
import type { SessionPhase } from '@/runtime/chat';

export type ChatToolApprovalProps = {
  sessionId: string | undefined;
  phase: SessionPhase;
  messages: readonly WisePenUIMessage[];
};
