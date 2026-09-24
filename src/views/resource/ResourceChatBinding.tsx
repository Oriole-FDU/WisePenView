import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import ChatPanel from '@/components/business/ChatPanel';
import type { ChatPanelAgentDebugConfig } from '@/components/business/ChatPanel/index.type';
import {
  createResourceChatStateProvider,
  type ResourceChatContext,
  type ResourceChatStateProvider,
} from '@/components/business/ChatPanel/ResourceChatProtocol';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import type { ResourceTarget } from '@/utils/navigation/resourceTarget';

interface ResourceChatBindingValue {
  resourceId: string;
  provider?: ResourceChatStateProvider;
  agentDebug?: ChatPanelAgentDebugConfig;
}

function createBindingStore() {
  return createStore<{ binding?: ResourceChatBindingValue }>(() => ({}));
}
const BindingContext = createContext<ReturnType<typeof createBindingStore> | null>(null);

export function ResourceChatBindingProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createBindingStore);
  return <BindingContext value={store}>{children}</BindingContext>;
}

function useBindingStore() {
  const store = useContext(BindingContext);
  if (!store)
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: '资源聊天绑定必须在 ResourceChatBindingProvider 内使用',
    });
  return store;
}

/** 只同步聊天所需的编辑运行态，不参与宿主布局。 */
export function ResourceChatBinding({
  resourceId,
  provider,
  agentDebug,
}: ResourceChatBindingValue) {
  const store = useBindingStore();
  /**
   * @wisepen-manual-effect
   * 执行时机：资源编辑运行态提交后，更新独立 Chat 子树的发送能力。
   * 不可替代原因：Chat 必须跨资源切换保持挂载，而同步签名与草稿保存能力属于编辑器实例。
   * cleanup：仅移除当前实例的绑定，避免旧资源卸载时清除新资源的能力。
   */
  useEffect(() => {
    const binding = { resourceId, provider, agentDebug };
    store.setState({ binding });
    return () => {
      if (store.getState().binding === binding) store.setState({ binding: undefined });
    };
  }, [store, resourceId, provider, agentDebug]);
  return null;
}

export function ResourceChatPanel({
  target,
  context,
  clearContext,
  showCollapseButton,
}: {
  target?: ResourceTarget;
  context?: ResourceChatContext;
  clearContext: (context?: ResourceChatContext) => void;
  showCollapseButton: boolean;
}) {
  const store = useBindingStore();
  const registered = useStore(store, (state) => state.binding);
  const binding = registered?.resourceId === target?.resourceId ? registered : undefined;
  const provider =
    binding?.provider ??
    (target?.resourceId && target.resourceType
      ? createResourceChatStateProvider({
          resourceId: target.resourceId,
          resourceType: target.resourceType,
          viewer: target.viewer,
        })
      : undefined);
  return (
    <ChatPanel
      showHeader
      showCollapseButton={showCollapseButton}
      resourceChat={{ provider, context, clearContext }}
      agentDebug={binding?.agentDebug}
    />
  );
}
