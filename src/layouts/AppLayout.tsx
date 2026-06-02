import ChatPanel from '@/components/ChatPanel';
import AppSidebar from '@/components/Sidebar/AppSidebar';
import DriveSidebar from '@/components/Sidebar/DriveSidebar';
import { useChatPanelStore, useCurrentChatSessionStore } from '@/store';
import { useUpdateEffect } from 'ahooks';
import { Layout } from 'antd';
import { useState } from 'react';
import { LuBot } from 'react-icons/lu';
import { Outlet, useLocation } from 'react-router-dom';
import styles from './AppLayout.module.less';
import { useChatPanelResize } from './useChatPanelResize';

const { Content, Sider } = Layout;

const RESOURCE_SIDEBAR_PATH_REGEX = /^\/app\/(note|pdf)\//;

function AppLayout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isResourceContext = RESOURCE_SIDEBAR_PATH_REGEX.test(location.pathname);
  const isChatPage = location.pathname.startsWith('/app/chat');
  const chatPanelCollapsed = useChatPanelStore((state) => state.chatPanelCollapsed);
  const chatPanelDraftOpen = useChatPanelStore((state) => state.chatPanelDraftOpen);
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const setChatPanelDraftOpen = useChatPanelStore((state) => state.setChatPanelDraftOpen);
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const hasSessionId = Boolean(currentSessionId);
  const shouldRenderChatPanel = hasSessionId || chatPanelDraftOpen;
  const safeChatPanelCollapsed = !shouldRenderChatPanel || chatPanelCollapsed;
  const { rootRef, chatResizeGuideRef, chatPanelWidth, chatResizing, onResizeStart } =
    useChatPanelResize();

  useUpdateEffect(() => {
    if (shouldRenderChatPanel) {
      setChatPanelCollapsed(false);
      return;
    }
    setChatPanelCollapsed(true);
  }, [setChatPanelCollapsed, shouldRenderChatPanel]);

  useUpdateEffect(() => {
    if (!hasSessionId && !chatPanelDraftOpen) return;
    if (hasSessionId) {
      setChatPanelDraftOpen(false);
    }
  }, [chatPanelDraftOpen, hasSessionId, setChatPanelDraftOpen]);

  const handleChatExpand = () => {
    if (!shouldRenderChatPanel) return;
    setChatPanelCollapsed(false);
  };

  return (
    <Layout
      ref={rootRef}
      className={styles.root}
      style={{ ['--chat-panel-width' as string]: `${chatPanelWidth}px` }}
    >
      {chatResizing && <div ref={chatResizeGuideRef} className={styles.chatResizeGuide} />}
      <Sider className={styles.leftSider} width={308} theme="light" collapsed={sidebarCollapsed}>
        {isResourceContext ? (
          <DriveSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        ) : (
          <AppSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}
      </Sider>

      <Layout className={styles.middleLayout}>
        {shouldRenderChatPanel && safeChatPanelCollapsed && !isChatPage && (
          <div className={styles.chatHandleZone}>
            <button
              type="button"
              className={styles.chatExpandHandle}
              onClick={handleChatExpand}
              aria-label="展开聊天面板"
            >
              <LuBot />
            </button>
          </div>
        )}
        <Content className={styles.middleContent}>
          <Outlet />
        </Content>
      </Layout>

      {!isChatPage && (
        <Sider
          className={styles.rightSider}
          width="var(--chat-panel-width)"
          theme="light"
          collapsed={safeChatPanelCollapsed}
          collapsedWidth={0}
          trigger={null}
        >
          {!safeChatPanelCollapsed && (
            <button
              type="button"
              className={`${styles.chatResizeHandle} ${chatResizing ? styles.chatResizeHandleActive : ''}`}
              onMouseDown={onResizeStart}
              aria-label="调整聊天面板宽度"
            />
          )}
          <div className={styles.rightSiderInner}>
            {shouldRenderChatPanel ? <ChatPanel collapsed={safeChatPanelCollapsed} /> : null}
          </div>
        </Sider>
      )}
    </Layout>
  );
}

export default AppLayout;
