import { clearFrontendStates, FRONTEND_STATE_SOURCE } from '@/frontendState';
import type { ResourceChatContext } from '@/layouts/Resource/_context/chatBinding/resourceChatModel';
import { useResourceChatContextStore } from '@/layouts/Resource/_store/useResourceChatContextStore';

/**
 * 资源聊天选区上下文的共享动作。
 *
 * 选区上下文归聊天上下文 store；这里提供无 Provider 的读写入口，供资源聊天面板与
 * 编辑器宿主能力复用，资源布局不持有该状态。
 */
export const resourceChatContextActions = {
  setContext: (context: ResourceChatContext) =>
    useResourceChatContextStore.getState().setContext(context),
  clearContext: (context?: ResourceChatContext) => {
    const current = useResourceChatContextStore.getState().context;
    if (context && current !== context) return;
    useResourceChatContextStore.getState().clearContext(context);
    clearFrontendStates({ source: FRONTEND_STATE_SOURCE.SELECTION });
  },
};
