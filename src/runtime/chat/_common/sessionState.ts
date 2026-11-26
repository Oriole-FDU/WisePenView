import { type ChatStatus, isToolUIPart } from 'ai';

import type { WisePenUIMessage } from '@/domains/ChatSession';

export type SessionPhase = 'idle' | 'sending' | 'streaming' | 'canceling' | 'hanged' | 'error';

export type SessionOperation = 'resuming' | 'canceling' | 'retry-cancel' | 'canceled' | null;

export function getSessionPhase(
  operation: SessionOperation,
  status: ChatStatus,
  lastMessage: WisePenUIMessage | undefined
): SessionPhase {
  if (operation === 'canceling') return 'canceling';
  if (status === 'streaming' || operation === 'resuming' || operation === 'retry-cancel') {
    return 'streaming';
  }
  if (status === 'submitted') return 'sending';
  if (
    operation !== 'canceled' &&
    lastMessage?.parts.some((part) => isToolUIPart(part) && part.state === 'approval-requested')
  ) {
    return 'hanged';
  }
  return status === 'error' ? 'error' : 'idle';
}
