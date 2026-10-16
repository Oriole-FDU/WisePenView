import { useStore } from 'zustand';

import { useRequiredContext } from '@/hooks/useRequiredContext';

import type { ChatInputStoreState } from './ChatInputStore';
import { ChatInputStoreContext } from './ChatInputStoreContext';

export function useChatInputStoreApi() {
  return useRequiredContext(ChatInputStoreContext, 'ChatInputStoreProvider');
}

export function useChatInputStore<T>(selector: (state: ChatInputStoreState) => T): T {
  return useStore(useChatInputStoreApi(), selector);
}
