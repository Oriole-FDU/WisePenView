import { useSize } from 'ahooks';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { type CSSProperties, type ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  Layout,
  LayoutChangedMeta,
  PanelImperativeHandle,
  PanelSize,
} from 'react-resizable-panels';

import AppIconButton from '@/components/base/Button/AppIconButton';
import {
  RESIZE_TARGET_MINIMUM_SIZE,
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/components/base/SystemResizable';
import {
  LAYOUT_RESIZE_HANDLE_RESERVE,
  NOTE_EDITOR_MIN_WIDTH,
  RESOURCE_SIDE_PANEL_MAX_WIDTH,
  RESOURCE_SIDE_PANEL_MIN_WIDTH,
} from '@/constants/layoutScale';
import { useResizablePanelSize } from '@/hooks/useResizablePanelSize';

import { useResourceSidePanelStore } from '../_store/useResourceSidePanelStore';
import type { ResourceSidePanelContent } from '../index.type';
import ResourceCommentPanel from './ResourceCommentPanel';
import styles from './style.module.less';

interface ResourceSidePanelProps {
  resourceId: string;
  config?: ResourceSidePanelContent;
  children: ReactNode;
}

function ResourceSidePanel({ resourceId, config, children }: ResourceSidePanelProps) {
  const { t } = useTranslation('resource');
  const storedMode = useResourceSidePanelStore(
    (state) => state.modeByResourceId[resourceId] ?? 'closed'
  );
  const width = useResourceSidePanelStore((state) => state.width);
  const setWidth = useResourceSidePanelStore((state) => state.setWidth);
  const setMode = useResourceSidePanelStore((state) => state.setMode);
  const hostRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hostSize = useSize(hostRef);
  const sidePanelRef = useRef<PanelImperativeHandle | null>(null);
  const pendingWidthRef = useRef<number | null>(null);
  const inlineCommentAvailable = Boolean(config?.inlineComment);
  const activeMode =
    storedMode === 'inlineComment' && !inlineCommentAvailable ? 'closed' : storedMode;
  const open = Boolean(config) && activeMode !== 'closed';
  // 以资源中栏的实际宽度判断，聊天栏拖宽也会触发覆盖模式。
  const isOverlay =
    (hostSize?.width ?? 0) < NOTE_EDITOR_MIN_WIDTH + width + LAYOUT_RESIZE_HANDLE_RESERVE;
  const overlayOpen = open && isOverlay;
  const dockOpen = open && !isOverlay;
  const panelSize = dockOpen ? width : 0;
  const hostStyle = { '--resource-side-panel-width': `${width}px` } as CSSProperties;

  useResizablePanelSize({ panelRef: sidePanelRef, size: panelSize });

  /**
   * @wisepen-manual-effect
   * 执行时机：遮罩打开时将焦点移到关闭按钮，退出覆盖模式时恢复焦点。
   * 不可替代原因：中栏尺寸由 ResizeObserver 更新，模式切换不一定来自用户点击。
   * cleanup：恢复仍在页面中的原焦点，避免焦点遗留在隐藏或卸载的按钮上。
   */
  useEffect(() => {
    if (!overlayOpen) return;
    const previousFocus = document.activeElement;
    closeButtonRef.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [overlayOpen]);

  const handleResize = (panelSize: PanelSize) => {
    if (!dockOpen) return;
    pendingWidthRef.current = panelSize.inPixels;
  };

  const handleLayoutChanged = (_layout: Layout, meta: LayoutChangedMeta) => {
    const pendingWidth = pendingWidthRef.current;
    pendingWidthRef.current = null;
    if (meta.isUserInteraction && dockOpen && pendingWidth != null) setWidth(pendingWidth);
  };

  const handleClose = () => setMode(resourceId, 'closed');

  const panelContent =
    activeMode === 'inlineComment' ? (
      config?.inlineComment
    ) : config ? (
      <ResourceCommentPanel
        key={config.resource.resourceId}
        resource={config.resource}
        onResourceChanged={config.onResourceChanged}
      />
    ) : null;
  const panelTitle =
    activeMode === 'inlineComment' ? t('sidePanel.annotation') : t('sidePanel.comments');
  const showFrameHeader = activeMode === 'inlineComment';
  const closeLabel =
    activeMode === 'inlineComment'
      ? t('sidePanel.collapseAnnotation')
      : t('sidePanel.collapseComments');

  return (
    <div ref={hostRef} className={styles.scrollHost} style={hostStyle}>
      {overlayOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label={closeLabel}
          tabIndex={-1}
          onClick={handleClose}
        />
      ) : null}
      <SystemResizablePanelGroup
        orientation="horizontal"
        className={clsx(styles.root, overlayOpen && styles.rootWithOverlay)}
        resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
        onLayoutChanged={handleLayoutChanged}
      >
        <SystemResizablePanel
          id="resource-renderer"
          minSize={isOverlay ? 0 : NOTE_EDITOR_MIN_WIDTH}
          className={styles.resourceRenderer}
          inert={overlayOpen}
        >
          {children}
        </SystemResizablePanel>

        <SystemResizableHandle
          collapsed={!dockOpen}
          disabled={!dockOpen}
          aria-label={t('sidePanel.resize')}
        />

        <SystemResizablePanel
          id="resource-side-panel"
          panelRef={sidePanelRef}
          defaultSize={panelSize}
          minSize={dockOpen ? RESOURCE_SIDE_PANEL_MIN_WIDTH : 0}
          maxSize={dockOpen ? RESOURCE_SIDE_PANEL_MAX_WIDTH : 0}
          groupResizeBehavior="preserve-pixel-size"
          className={styles.sidePanel}
          aria-label={
            activeMode === 'inlineComment'
              ? t('sidePanel.annotationAria')
              : t('sidePanel.commentsAria')
          }
          aria-hidden={!open ? true : undefined}
          onResize={handleResize}
        >
          {open ? (
            <section
              className={styles.panelFrame}
              aria-label={panelTitle}
              onKeyDown={(event) => {
                if (overlayOpen && event.key === 'Escape' && !event.defaultPrevented) {
                  event.stopPropagation();
                  handleClose();
                }
              }}
            >
              <AppIconButton
                ref={closeButtonRef}
                className={styles.closeButton}
                icon={<X size={18} aria-hidden="true" />}
                label={closeLabel}
                size="sm"
                onPress={handleClose}
              />
              {showFrameHeader ? (
                <header className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>{panelTitle}</h2>
                </header>
              ) : null}
              <div className={styles.panelBody}>{panelContent}</div>
            </section>
          ) : null}
        </SystemResizablePanel>
      </SystemResizablePanelGroup>
    </div>
  );
}

export default ResourceSidePanel;
