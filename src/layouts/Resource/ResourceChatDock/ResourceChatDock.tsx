import { type ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { RESOURCE_MAIN_MIN_WIDTH } from '@/constants/layoutScale';
import { ChatDockLayout } from '@/layouts/ChatDockLayout';
import { useMainShell } from '@/layouts/MainShell/_context';
import {
  ResourceChatBindingProvider,
  ResourceChatPanel,
} from '@/layouts/Resource/_context/chatBinding';
import type { ResourceHostRouteContext } from '@/layouts/Resource/_context/host';
import { useResourceChatContextStore } from '@/layouts/Resource/_store/useResourceChatContextStore';

import { resourceChatContextActions } from './resourceChatDockModel';

interface ResourceChatDockProps {
  /** 聊天面板发起请求时使用的当前资源 */
  target: ResourceHostRouteContext;
  children: ReactNode;
}

/**
 * 资源与聊天的装配层：把资源内容与资源聊天面板交给 ChatDockLayout 决定布局关系。
 *
 * 只负责资源侧的装配（目标资源、选区上下文与编辑器聊天绑定），不实现任何布局逻辑。
 */
function ResourceChatDock({ target, children }: ResourceChatDockProps) {
  const { t } = useTranslation('workspace');
  const { isMobileLayout } = useMainShell();
  const context = useResourceChatContextStore((state) => state.context);
  /**
   * @wisepen-manual-effect
   * 执行时机：资源聊天层离开页面时结束未发送的选区。
   * 不可替代原因：聊天上下文按标签存在，卸载不会自动清理它。
   * cleanup：移除当前资源的选区和匹配信息。
   */
  useEffect(() => () => resourceChatContextActions.clearContext(), []);

  return (
    <ResourceChatBindingProvider>
      <ChatDockLayout
        mainMinWidth={RESOURCE_MAIN_MIN_WIDTH}
        panelId="app-resource-chat"
        chatLabel={t('shell.chatPanel')}
        chat={
          <ResourceChatPanel
            target={target}
            showCollapseButton={isMobileLayout}
            context={context}
            clearContext={resourceChatContextActions.clearContext}
          />
        }
      >
        {children}
      </ChatDockLayout>
    </ResourceChatBindingProvider>
  );
}

export default ResourceChatDock;
