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

/** 把应用壳的对话布局换算成可拖拽面板参数，供 ChatDockLayout 内部使用。 */
export function useChatDockPanel() {
  const panelRef = useRef<PanelImperativeHandle | null>(null);
  const pendingWidthRef = useRef<number | null>(null);
  const collapsed = useChatDockLayoutStore((state) => state.chatPanelCollapsed);
  const width = useChatDockLayoutStore((state) => state.chatPanelWidth);
  const setWidth = useChatDockLayoutStore((state) => state.setChatPanelWidth);
  const open = !collapsed;
  const panelSize = open ? clampChatPanelWidth(width) : 0;

  useResizablePanelSize({ panelRef, size: panelSize });

  return {
    panelRef,
    open,
    panelSize,
    minSize: open ? CHAT_PANEL_MIN_WIDTH : 0,
    maxSize: open ? CHAT_PANEL_MAX_WIDTH : 0,
    handleResize: (size: PanelSize) => {
      if (open) pendingWidthRef.current = clampChatPanelWidth(size.inPixels);
    },
    handleLayoutChanged: (_layout: Layout, meta: LayoutChangedMeta) => {
      const pendingWidth = pendingWidthRef.current;
      pendingWidthRef.current = null;
      if (meta.isUserInteraction && open && pendingWidth != null) setWidth(pendingWidth);
    },
  };
}
