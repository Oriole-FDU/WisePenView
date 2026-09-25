import { createContext } from 'react';
import type { StoreApi } from 'zustand/vanilla';

import type { ChatPanelAgentDebugConfig } from '@/components/business/ChatPanel/index.type';
import type { ResourceChatStateProvider } from '@/components/business/ChatPanel/ResourceChatProtocol';

export interface ResourceChatBindingValue {
  resourceId: string;
  provider?: ResourceChatStateProvider;
  agentDebug?: ChatPanelAgentDebugConfig;
}

export type ResourceChatBindingStore = StoreApi<{ binding?: ResourceChatBindingValue }>;

export const ResourceChatBindingContext = createContext<ResourceChatBindingStore | null>(null);
