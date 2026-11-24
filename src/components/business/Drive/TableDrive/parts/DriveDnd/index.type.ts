import type { DragEvent, ReactElement, ReactNode } from 'react';

import type { DriveTableRow } from '../../index.type';

export interface DriveDndRowProps {
  row: DriveTableRow;
  draggableDisabled: boolean;
  droppableDisabled: boolean;
  children: ReactElement;
}

export interface DriveDroppableBreadcrumbProps {
  targetNodeId: string;
  disabled: boolean;
  children: ReactNode;
}

export interface ExternalFileDropHandlers {
  onDragEnter: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}

export interface ExternalFileDroppableBreadcrumbProps {
  nodeId: string;
  isActive: boolean;
  handlers: ExternalFileDropHandlers;
  children: ReactNode;
}

export interface ExternalFileDropTargetProps {
  isActive: boolean;
  children: ReactNode;
}

export interface DriveDragOverlayProps {
  row: DriveTableRow;
  count: number;
}
