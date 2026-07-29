import EntryIcon from '@/components/Icons/EntryIcon';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { type DragEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { DriveTableRow } from '../../index.type';
import styles from '../../style.module.less';

interface DriveDndNameContentProps {
  row: DriveTableRow;
  draggableDisabled: boolean;
  droppableDisabled: boolean;
  children: ReactNode;
}

export function DriveDndNameContent({
  row,
  draggableDisabled,
  droppableDisabled,
  children,
}: DriveDndNameContentProps) {
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
  const setDraggableNodeRef = draggable.setNodeRef;
  const setActivatorNodeRef = draggable.setActivatorNodeRef;
  const setDroppableNodeRef = droppable.setNodeRef;
  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableNodeRef(node);
    setActivatorNodeRef(node);
    setDroppableNodeRef(node?.closest<HTMLElement>('[data-folder-row-id]') ?? null);
  };

  return (
    <span
      ref={setNodeRef}
      className={styles.dndNameContent}
      data-dragging={draggable.isDragging ? 'true' : undefined}
      data-drop-target={droppable.isOver ? 'true' : undefined}
      onMouseDownCapture={(event) => {
        draggable.listeners?.onMouseDown?.(event);
      }}
    >
      {children}
    </span>
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
          folderIconType={row.folderIconType}
          resourceType={row.resourceType}
          resourceIconType={row.resourceIconType}
        />
      </span>
      <span className={styles.dragOverlayName}>{row.name}</span>
      <span className={styles.dragOverlayCount}>{t('table.dragSelected', { count })}</span>
    </div>
  );
}
