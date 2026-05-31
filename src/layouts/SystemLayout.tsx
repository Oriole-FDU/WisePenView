import React, { useCallback, useRef, useState } from 'react';
import { Layout } from 'antd';
import { useMount, useUpdateEffect } from 'ahooks';
import { LuBot } from 'react-icons/lu';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import ChatPanel from '@/components/ChatPanel';
import { useChatPanelStore, useCurrentChatSessionStore } from '@/store';
import styles from './SystemLayout.module.less';

const { Content, Sider } = Layout;
const MIN_CHAT_PANEL_WIDTH = 320;
const MAX_CHAT_PANEL_WIDTH = 1020;

const clampWidth = (width: number, min: number, max: number): number =>
  Math.min(Math.max(width, min), max);

const getMaxChatPanelWidth = (): number => {
  if (typeof window === 'undefined') return MAX_CHAT_PANEL_WIDTH;
  const viewportBasedMax = window.innerWidth - 480;
  return Math.max(MIN_CHAT_PANEL_WIDTH, Math.min(MAX_CHAT_PANEL_WIDTH, viewportBasedMax));
};

const SystemLayout: React.FC = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const chatResizeGuideRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatResizing, setChatResizing] = useState(false);
  const chatPanelCollapsed = useChatPanelStore((state) => state.chatPanelCollapsed);
  const chatPanelWidth = useChatPanelStore((state) => state.chatPanelWidth);
  const chatPanelDraftOpen = useChatPanelStore((state) => state.chatPanelDraftOpen);
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const setChatPanelWidth = useChatPanelStore((state) => state.setChatPanelWidth);
  const setChatPanelDraftOpen = useChatPanelStore((state) => state.setChatPanelDraftOpen);
  const chatPanelWidthRef = useRef(chatPanelWidth);
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const isChatPage = location.pathname.startsWith('/app/chat');
  const hasSessionId = Boolean(currentSessionId);
  const shouldRenderChatPanel = hasSessionId || chatPanelDraftOpen;
  const safeChatPanelCollapsed = !shouldRenderChatPanel || chatPanelCollapsed;

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

  useMount(() => {
    const normalizedWidth = clampWidth(
      chatPanelWidth,
      MIN_CHAT_PANEL_WIDTH,
      getMaxChatPanelWidth()
    );
    if (normalizedWidth !== chatPanelWidth) {
      setChatPanelWidth(normalizedWidth);
      return;
    }
    chatPanelWidthRef.current = chatPanelWidth;
  });

  useUpdateEffect(() => {
    chatPanelWidthRef.current = chatPanelWidth;
  }, [chatPanelWidth]);

  const handleChatResizeStart = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = chatPanelWidthRef.current;
      let frameId: number | null = null;
      let pendingWidth = startWidth;
      setChatResizing(true);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      window.requestAnimationFrame(() => {
        if (rootRef.current && chatResizeGuideRef.current) {
          const guideLeft = rootRef.current.clientWidth - startWidth;
          chatResizeGuideRef.current.style.transform = `translateX(${guideLeft}px)`;
        }
      });

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = startX - moveEvent.clientX;
        pendingWidth = clampWidth(
          startWidth + deltaX,
          MIN_CHAT_PANEL_WIDTH,
          getMaxChatPanelWidth()
        );
        if (frameId !== null) return;
        frameId = window.requestAnimationFrame(() => {
          if (rootRef.current && chatResizeGuideRef.current) {
            const guideLeft = rootRef.current.clientWidth - pendingWidth;
            chatResizeGuideRef.current.style.transform = `translateX(${guideLeft}px)`;
          }
          frameId = null;
        });
      };

      const handleMouseUp = () => {
        if (frameId !== null) {
          window.cancelAnimationFrame(frameId);
        }
        if (rootRef.current && chatResizeGuideRef.current) {
          const guideLeft = rootRef.current.clientWidth - pendingWidth;
          chatResizeGuideRef.current.style.transform = `translateX(${guideLeft}px)`;
        }
        chatPanelWidthRef.current = pendingWidth;
        setChatPanelWidth(pendingWidth);
        setChatResizing(false);
        document.body.style.removeProperty('user-select');
        document.body.style.removeProperty('cursor');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [setChatPanelWidth]
  );

  const handleChatExpand = useCallback(() => {
    if (!shouldRenderChatPanel) return;
    setChatPanelCollapsed(false);
  }, [setChatPanelCollapsed, shouldRenderChatPanel]);

  return (
    <Layout
      ref={rootRef}
      className={styles.root}
      style={{ ['--chat-panel-width' as string]: `${chatPanelWidth}px` }}
    >
      {chatResizing && <div ref={chatResizeGuideRef} className={styles.chatResizeGuide} />}
      {/* Left Sidebar */}
      <Sider className={styles.leftSider} width={308} theme="light" collapsed={sidebarCollapsed}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </Sider>

      {/* Middle Layout */}
      <Layout className={styles.middleLayout}>
        {shouldRenderChatPanel && safeChatPanelCollapsed && !isChatPage && (
          <div className={styles.chatHandleZone}>
            <button
              type="button"
              className={styles.chatExpandHandle}
              onClick={handleChatExpand}
              aria-label="expand chat panel"
            >
              <LuBot />
            </button>
          </div>
        )}
        <Content className={styles.middleContent}>
          <Outlet />
        </Content>
      </Layout>

      {/* Right AI Panel — hidden on chat page */}
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
              onMouseDown={handleChatResizeStart}
              aria-label="resize chat panel"
            />
          )}
          <div className={styles.rightSiderInner}>
            {shouldRenderChatPanel ? <ChatPanel collapsed={safeChatPanelCollapsed} /> : null}
          </div>
        </Sider>
      )}
    </Layout>
  );
};

export default SystemLayout;