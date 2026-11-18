import type { UseChatMessageControlResult } from './useChatMessageControl';
import { useChatMessageControl } from './useChatMessageControl';

export interface UseChatControlResult {
  message: UseChatMessageControlResult;
}

export function useChatControl(): UseChatControlResult {
  const message = useChatMessageControl();
  return { message };
}
