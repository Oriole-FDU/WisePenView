import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  cloneElement,
  type DragEvent,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { useTranslation } from 'react-i18next';

import EntryIcon from '@/components/base/Icons/EntryIcon';
import { cn } from '@/utils/cn';

import type { DriveTableRow } from '../../index.type';
import styles from '../../style.module.less';

const ROW_DND_IGNORE_TARGET_SELECTOR = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[data-row-click-ignore="true"]',
  '[data-slot="selection"]',
  '[slot="selection"]',
  '.checkbox',
].join(',');

interface DriveDndRowElementProps {
  className?: string;
  onMouseDownCapture?: MouseEventHandler<HTMLElement>;
  ref?: Ref<HTMLElement>;
}

interface DriveDndRowProps {
  row: DriveTableRow;
  draggableDisabled: boolean;
  droppableDisabled: boolean;
  children: ReactElement;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (!ref) return;

  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  ref.current = value;
}

function isRowDndIgnoredTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(ROW_DND_IGNORE_TARGET_SELECTOR));
}

export function DriveDndRow({
  row,
  draggableDisabled,
  droppableDisabled,
  children,
}: DriveDndRowProps) {
  const draggable = useDraggable({
    id: `drive-row:${row.id}`,
    disabled: draggableDisabled,
    data: { rowId: row.id },
  });
  const droppable = useDroppable({
    id: `drive-folder:${row.id}`,
    disabled: droppableDisabled,
    data: { targetNodeId: row.node.id },
  });
  const childProps = children.props as DriveDndRowElementProps;

  const setRowNodeRef = (node: HTMLElement | null) => {
    assignRef(childProps.ref, node);
    draggable.setNodeRef(node);
    draggable.setActivatorNodeRef(node);
    droppable.setNodeRef(node);
  };
  const handleMouseDownCapture: MouseEventHandler<HTMLElement> = (event) => {
    childProps.onMouseDownCapture?.(event);
    if (event.defaultPrevented || isRowDndIgnoredTarget(event.target)) return;

    draggable.listeners?.onMouseDown?.(event);
  };

  return cloneElement(
    children as ReactElement<DriveDndRowElementProps>,
    {
      ref: setRowNodeRef,
      className: cn(childProps.className, styles.dndBodyRow),
      'data-dragging': draggable.isDragging ? 'true' : undefined,
      'data-drive-dnd-drop-target': droppable.isOver ? 'true' : undefined,
      onMouseDownCapture: handleMouseDownCapture,
    } as Partial<DriveDndRowElementProps> & {
      'data-dragging'?: string;
      'data-drive-dnd-drop-target'?: string;
    }
  );
}

interface DriveDroppableBreadcrumbProps {
  targetNodeId: string;
  disabled: boolean;
  children: ReactNode;
}

interface ExternalFileDropHandlers {
  onDragEnter: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}

export function DriveDroppableBreadcrumb({
  targetNodeId,
  disabled,
  children,
}: DriveDroppableBreadcrumbProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `drive-breadcrumb:${targetNodeId}`,
    disabled,
    data: { targetNodeId },
  });

  return (
    <span
      ref={setNodeRef}
      className={styles.breadcrumbDropTarget}
      data-drop-target={isOver ? 'true' : undefined}
    >
      {children}
    </span>
  );
}

interface ExternalFileDroppableBreadcrumbProps {
  nodeId: string;
  isActive: boolean;
  handlers: ExternalFileDropHandlers;
  children: ReactNode;
}

interface ExternalFileDropHandlers {
  onDragEnter: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}

/** 原生文件拖入的面包屑容器，不参与 dnd-kit 的内部节点移动。 */
export function ExternalFileDroppableBreadcrumb({
  nodeId,
  isActive,
  handlers,
  children,
}: ExternalFileDroppableBreadcrumbProps) {
  return (
    <span
      className={styles.externalFileBreadcrumbTarget}
      data-drive-breadcrumb-node-id={nodeId}
      data-drop-target={isActive ? 'true' : undefined}
      onDragEnter={handlers.onDragEnter}
      onDragOver={handlers.onDragOver}
      onDragLeave={handlers.onDragLeave}
      onDrop={handlers.onDrop}
    >
      {children}
    </span>
  );
}

interface DriveDragOverlayProps {
  row: DriveTableRow;
  count: number;
}

export function DriveDragOverlay({ row, count }: DriveDragOverlayProps) {
  const { t } = useTranslation('drive');

  return (
    <div className={styles.dragOverlay}>
      <span className={styles.dragOverlayIcon}>
        <EntryIcon
          entryType={row.entryType}
          folderVariant={row.folderVariant}
          resourceType={row.resourceType}
          resourceIconType={row.resourceIconType}
        />
      </span>
      <span className={styles.dragOverlayName}>{row.name}</span>
      <span className={styles.dragOverlayCount}>{t('table.dragSelected', { count })}</span>
    </div>
  );
}
