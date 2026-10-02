import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

import {
  RESIZE_TARGET_MINIMUM_SIZE,
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/components/base/SystemResizable';
import { useMainShell } from '@/layouts/MainShell/_context';

import { useChatDockPanel } from './controllers/useChatDockPanel';
import type { ChatDockLayoutProps } from './index.type';
import styles from './style.module.less';

/**
 * 对话 dock 布局：只负责左侧内容与右侧对话面板的关系。
 *
 * 桌面端把对话面板挂在左侧内容右侧并支持拖拽、折叠与宽度持久化；窄屏改成覆盖式 overlay。
 * 左右两侧都以槽位传入，布局不感知资源、课程或聊天的业务语义。
 */
export default function ChatDockLayout({
  left,
  right,
  leftMinWidth,
  chatLabel,
  panelId = 'app-chat-dock',
  className,
}: ChatDockLayoutProps) {
  const { t } = useTranslation('workspace');
  const { isMobileLayout } = useMainShell();
  const panel = useChatDockPanel();
  const overlayOpen = panel.open && isMobileLayout;

  return (
    <div
      className={clsx(styles.shell, overlayOpen && styles.shellWithOverlay, className)}
      data-chat-open={panel.open || undefined}
    >
      <SystemResizablePanelGroup
        orientation="horizontal"
        className={styles.root}
        resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
        onLayoutChanged={panel.handleLayoutChanged}
      >
        <SystemResizablePanel
          minSize={isMobileLayout ? 0 : leftMinWidth}
          className={styles.mainPanel}
        >
          {left}
        </SystemResizablePanel>

        {!isMobileLayout ? (
          <>
            <SystemResizableHandle
              collapsed={!panel.open}
              disabled={!panel.open}
              aria-label={t('shell.resizeChatPanel')}
            />
            <SystemResizablePanel
              id={panelId}
              panelRef={panel.panelRef}
              defaultSize={panel.panelSize}
              minSize={panel.minSize}
              maxSize={panel.maxSize}
              groupResizeBehavior="preserve-pixel-size"
              className={styles.chatDock}
              aria-label={chatLabel}
              aria-hidden={!panel.open ? true : undefined}
              onResize={panel.handleResize}
            >
              {panel.open ? right : null}
            </SystemResizablePanel>
          </>
        ) : null}
      </SystemResizablePanelGroup>

      {overlayOpen ? (
        <div className={styles.chatOverlay} role="dialog" aria-modal="true" aria-label={chatLabel}>
          {right}
        </div>
      ) : null}
    </div>
  );
}
