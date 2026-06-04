import ChatPanel from '@/components/ChatPanel';
import AppSidebar from '@/components/Sidebar/AppSidebar';
import DriveSidebar from '@/components/Sidebar/DriveSidebar';
import { useChatPanelStore, useCurrentChatSessionStore } from '@/store';
import { useUpdateEffect } from 'ahooks';
import { Layout } from 'antd';
import { Bot } from 'lucide-react';
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import styles from './AppLayout.module.less';
import { useChatPanelResize } from './useChatPanelResize';

const { Content, Sider } = Layout;

const RESOURCE_SIDEBAR_PATH_REGEX = /^\/app\/(note|pdf)\//;

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const isResourceContext = RESOURCE_SIDEBAR_PATH_REGEX.test(location.pathname);
  const chatPanelCollapsed = useChatPanelStore((state) => state.chatPanelCollapsed);
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const hasSessionId = Boolean(currentSessionId);
  const safeChatPanelCollapsed = !hasSessionId || chatPanelCollapsed;
  const { rootRef, chatResizeGuideRef, chatPanelWidth, chatResizing, onResizeStart } =
    useChatPanelResize();

  useUpdateEffect(() => {
    if (hasSessionId) {
      setChatPanelCollapsed(false);
      return;
    }
    setChatPanelCollapsed(true);
  }, [hasSessionId, setChatPanelCollapsed]);

  return (
    <Layout
      ref={rootRef}
      className={styles.root}
      style={{ ['--chat-panel-width' as string]: `${chatPanelWidth}px` }}
    >
      {chatResizing && <div ref={chatResizeGuideRef} className={styles.chatResizeGuide} />}
      {/* 左侧 Sidebar：note/pdf 路由下切换为 DriveSidebar 形态 */}
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

      {/* 中间布局 */}
      <Layout className={styles.middleLayout}>
        {hasSessionId && safeChatPanelCollapsed && (
          <div className={styles.chatHandleZone}>
            <button
              type="button"
              className={styles.chatExpandHandle}
              onClick={() => setChatPanelCollapsed(false)}
              aria-label="展开右侧对话栏"
            >
              <Bot />
            </button>
          </div>
        )}
        <Content className={styles.middleContent}>
          <Outlet />
        </Content>
      </Layout>

      {/* 右侧 AI Panel */}
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
            aria-label="调整右侧边栏宽度"
          />
        )}
        <div className={styles.rightSiderInner}>
          {hasSessionId ? <ChatPanel collapsed={safeChatPanelCollapsed} /> : null}
        </div>
      </Sider>
    </Layout>
  );
}

export default AppLayout;
