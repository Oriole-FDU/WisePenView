import {
  ADMIN_SIDEBAR_COLLAPSED_WIDTH,
  clampSidebarWidth,
  MAIN_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
} from '@/constants/layoutScale';
import { useSystemLayoutStore } from '@/layouts/_common/_store/useSystemLayoutStore';
import AdminSidebar from '@/layouts/_common/Sidebar/AdminSidebar';
import {
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/layouts/_common/SystemResizable';
import { useResizablePanelSize } from '@/layouts/_common/useResizablePanelSize';
import clsx from 'clsx';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  Layout,
  LayoutChangedMeta,
  PanelImperativeHandle,
  PanelSize,
} from 'react-resizable-panels';
import { Outlet } from 'react-router-dom';
import styles from './AdminLayout.module.less';

function AdminLayout() {
  const { t } = useTranslation('shell');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const storedSidebarWidth = useSystemLayoutStore((state) => state.adminSidebarWidth);
  const setSidebarWidth = useSystemLayoutStore((state) => state.setAdminSidebarWidth);
  const sidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  const pendingSidebarWidthRef = useRef<number | null>(null);
  const sidebarWidth = clampSidebarWidth(storedSidebarWidth);
  const sidebarPanelSize = sidebarCollapsed ? ADMIN_SIDEBAR_COLLAPSED_WIDTH : sidebarWidth;

  useResizablePanelSize({
    panelRef: sidebarPanelRef,
    size: sidebarPanelSize,
  });

  const handleSidebarToggle = () => {
    setSidebarCollapsed((collapsed) => {
      if (!collapsed) {
        const currentWidth = sidebarPanelRef.current?.getSize().inPixels;
        if (currentWidth != null) {
          const nextSidebarWidth = clampSidebarWidth(currentWidth);
          if (nextSidebarWidth > SIDEBAR_MIN_WIDTH || sidebarWidth === SIDEBAR_MIN_WIDTH) {
            setSidebarWidth(nextSidebarWidth);
          }
        }
      }
      return !collapsed;
    });
  };

  const handleSidebarResize = (panelSize: PanelSize) => {
    if (sidebarCollapsed) return;
    pendingSidebarWidthRef.current = clampSidebarWidth(panelSize.inPixels);
  };

  const handleLayoutChanged = (_layout: Layout, meta: LayoutChangedMeta) => {
    const pendingSidebarWidth = pendingSidebarWidthRef.current;
    pendingSidebarWidthRef.current = null;
    if (sidebarCollapsed || !meta.isUserInteraction || pendingSidebarWidth == null) return;
    setSidebarWidth(pendingSidebarWidth);
  };

  return (
    <SystemResizablePanelGroup
      orientation="horizontal"
      className={styles.root}
      onLayoutChanged={handleLayoutChanged}
    >
      <SystemResizablePanel
        id="admin-sidebar"
        panelRef={sidebarPanelRef}
        defaultSize={sidebarPanelSize}
        minSize={sidebarCollapsed ? ADMIN_SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_MIN_WIDTH}
        maxSize={sidebarCollapsed ? ADMIN_SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_MAX_WIDTH}
        groupResizeBehavior="preserve-pixel-size"
        className={styles.leftSider}
        aria-label={t('navigation.adminSidebar')}
        onResize={handleSidebarResize}
      >
        <AdminSidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />
      </SystemResizablePanel>

      <SystemResizableHandle
        className={clsx(styles.resizeHandle, sidebarCollapsed && styles.resizeHandleCollapsed)}
        disabled={sidebarCollapsed}
      />

      <SystemResizablePanel
        id="admin-main"
        minSize={MAIN_MIN_WIDTH}
        className={styles.middleLayout}
      >
        <main className={styles.middleContent}>
          <Outlet />
        </main>
      </SystemResizablePanel>
    </SystemResizablePanelGroup>
  );
}

export default AdminLayout;
