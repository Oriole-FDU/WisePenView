import { useMount } from 'ahooks';
import { useRef } from 'react';
import type {
  Layout,
  LayoutChangedMeta,
  PanelImperativeHandle,
  PanelSize,
} from 'react-resizable-panels';

import {
  CHAT_PANEL_MAX_WIDTH,
  CHAT_PANEL_MIN_WIDTH,
  clampChatPanelWidth,
} from '@/constants/layoutScale';
import { useResizablePanelSize } from '@/hooks/useResizablePanelSize';
import { useChatDockLayoutStore } from '@/layouts/MainShell/_store/useChatDockLayoutStore';

export const useCourseChatDockController = () => {
  const panelRef = useRef<PanelImperativeHandle | null>(null);
  const pendingWidthRef = useRef<number | null>(null);
  const collapsed = useChatDockLayoutStore((state) => state.chatPanelCollapsed);
  const width = useChatDockLayoutStore((state) => state.chatPanelWidth);
  const setCollapsed = useChatDockLayoutStore((state) => state.setChatPanelCollapsed);
  const setWidth = useChatDockLayoutStore((state) => state.setChatPanelWidth);
  const open = !collapsed;
  const panelSize = open ? clampChatPanelWidth(width) : 0;

  useResizablePanelSize({ panelRef, size: panelSize });

  useMount(() => setCollapsed(true));

  return {
    panelRef,
    collapsed,
    open,
    panelSize,
    minSize: open ? CHAT_PANEL_MIN_WIDTH : 0,
    maxSize: open ? CHAT_PANEL_MAX_WIDTH : 0,
    openPanel: () => setCollapsed(false),
    toggle: () => setCollapsed(!collapsed),
    handleResize: (size: PanelSize) => {
      if (open) pendingWidthRef.current = clampChatPanelWidth(size.inPixels);
    },
    handleLayoutChanged: (_layout: Layout, meta: LayoutChangedMeta) => {
      const pendingWidth = pendingWidthRef.current;
      pendingWidthRef.current = null;
      if (meta.isUserInteraction && open && pendingWidth != null) setWidth(pendingWidth);
    },
  };
};
