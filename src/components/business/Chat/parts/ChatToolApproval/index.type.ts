import type { ChatStatus } from 'ai';

import type { WisePenUIMessage } from '@/domains/ChatSession';

export type ChatToolApprovalProps = {
  sessionId: string | undefined;
  messages: readonly WisePenUIMessage[];
  status: ChatStatus;
};
