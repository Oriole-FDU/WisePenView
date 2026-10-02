import { useEffect } from 'react';
import { useStore } from 'zustand';

import ChatPanel from '@/components/business/ChatPanel';
import type { ResourceTarget } from '@/domains/Resource/model/resourceTarget';

import { type ResourceChatBindingValue } from './ResourceChatBindingContext';
import { createResourceChatProvider, type ResourceChatContext } from './resourceChatModel';
import { useResourceChatBinding } from './useResourceChatBinding';

/** 只同步聊天所需的编辑运行态，不参与宿主布局。 */
export function ResourceChatBinding({
  resourceId,
  provider,
  hostAgentPort,
}: ResourceChatBindingValue) {
  const store = useResourceChatBinding();
  /**
   * @wisepen-manual-effect
   * 执行时机：资源编辑运行态提交后，更新独立 Chat 子树的发送能力。
   * 不可替代原因：Chat 必须跨资源切换保持挂载，而同步签名与草稿保存能力属于编辑器实例。
   * cleanup：仅移除当前实例的绑定，避免旧资源卸载时清除新资源的能力。
   */
  useEffect(() => {
    const binding = { resourceId, provider, hostAgentPort };
    store.setState({ binding });
    return () => {
      if (store.getState().binding === binding) store.setState({ binding: undefined });
    };
  }, [store, resourceId, provider, hostAgentPort]);
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
  const store = useResourceChatBinding();
  const registered = useStore(store, (state) => state.binding);
  const binding = registered?.resourceId === target?.resourceId ? registered : undefined;
  const provider =
    binding?.provider ??
    (target?.resourceId && target.resourceType
      ? createResourceChatProvider({
          resourceId: target.resourceId,
          resourceType: target.resourceType,
          viewer: target.viewer,
        })
      : undefined);
  return (
    <ChatPanel
      resourceId={target?.resourceId}
      showHeader
      showCollapseButton={showCollapseButton}
      resourceChat={{ provider, context, clearContext }}
      hostAgentPort={binding?.hostAgentPort}
    />
  );
}
