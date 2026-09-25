import { clsx } from 'clsx';
import type { ComponentProps } from 'react';
import * as ResizablePrimitive from 'react-resizable-panels';

import styles from './style.module.less';

const RESIZE_TARGET_MINIMUM_SIZE = { fine: 16, coarse: 32 } as const;

function SystemResizablePanelGroup({
  className,
  ...props
}: ComponentProps<typeof ResizablePrimitive.Group>) {
  return (
    <ResizablePrimitive.Group
      data-slot="system-resizable-panel-group"
      className={clsx(styles.panelGroup, className)}
      {...props}
    />
  );
}

function SystemResizablePanel({
  className,
  ...props
}: ComponentProps<typeof ResizablePrimitive.Panel>) {
  return (
    <ResizablePrimitive.Panel data-slot="system-resizable-panel" className={className} {...props} />
  );
}

function SystemResizableHandle({
  collapsed,
  className,
  ...props
}: ComponentProps<typeof ResizablePrimitive.Separator> & {
  collapsed?: boolean;
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="system-resizable-handle"
      className={clsx(styles.handle, collapsed && styles.handleCollapsed, className)}
      {...props}
    />
  );
}

export {
  RESIZE_TARGET_MINIMUM_SIZE,
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
};
