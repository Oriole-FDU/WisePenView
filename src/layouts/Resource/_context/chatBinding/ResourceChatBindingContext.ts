import { createContext } from 'react';
import type { StoreApi } from 'zustand/vanilla';

import type { ChatHostAgentPort } from '@/components/business/Chat/index.type';

import type { ResourceChatProvider } from './resourceChatModel';

export interface ResourceChatBindingValue {
  resourceId: string;
  provider?: ResourceChatProvider;
  /** 宿主注入聊天的 Agent 端口（如正在调试的草稿 Agent 与它的发送守卫） */
  hostAgentPort?: ChatHostAgentPort;
}

export type ResourceChatBindingStore = StoreApi<{ binding?: ResourceChatBindingValue }>;

export const ResourceChatBindingContext = createContext<ResourceChatBindingStore | null>(null);
