import { useDriveDocumentUpload } from '@/components/Drive/common/useDriveDocumentUpload';
import type { DriveNode } from '@/domains/Drive';
import { useRef, useState, type DragEvent } from 'react';
import type { DriveTableRow } from '../index.type';

interface UseTableDriveExternalDndControllerParams {
  pathTagId?: string;
  isTrashView: boolean;
  rowMap: Map<string, DriveTableRow>;
  pathNodes: DriveNode[];
  onUploadSuccess: () => void;
}

interface ExternalFileDropTargetBase {
  pathTagId: string;
}

interface BackgroundFileDropTarget extends ExternalFileDropTargetBase {
  kind: 'background';
}

interface RowFileDropTarget extends ExternalFileDropTargetBase {
  kind: 'row';
  rowId?: string;
}

interface BreadcrumbFileDropTarget extends ExternalFileDropTargetBase {
  kind: 'breadcrumb';
  breadcrumbNodeId: string;
}

type ExternalFileDropTarget =
  BackgroundFileDropTarget | RowFileDropTarget | BreadcrumbFileDropTarget;

/** 处理文件管理器拖入的原生拖放事件，与 Drive 内部节点移动保持隔离。 */
export function useTableDriveExternalDndController({
  pathTagId,
  isTrashView,
  rowMap,
  pathNodes,
  onUploadSuccess,
}: UseTableDriveExternalDndControllerParams) {
  const { queueDocuments } = useDriveDocumentUpload({ pathTagId, onSuccess: onUploadSuccess });
  const [activeDropTarget, setActiveDropTarget] = useState<ExternalFileDropTarget | null>(null);
  const fileDragDepthRef = useRef(0);

  const clearFileDragState = () => {
    fileDragDepthRef.current = 0;
    setActiveDropTarget(null);
  };

  const resolveDropTarget = (event: DragEvent<HTMLElement>): ExternalFileDropTarget | null => {
    if (isTrashView) return null;

    const targetRow = getTargetRow(event, rowMap);
    if (targetRow) {
      if (targetRow.node.type !== 'folder' || targetRow.node.systemType) {
        return null;
      }
      return { kind: 'row', pathTagId: targetRow.node.tagId, rowId: targetRow.id };
    }

    const breadcrumbNode = getTargetBreadcrumbNode(event, pathNodes);
    if (breadcrumbNode) {
      const breadcrumbPathTagId = getNodePathTagId(breadcrumbNode);
      return breadcrumbPathTagId
        ? {
            kind: 'breadcrumb',
            pathTagId: breadcrumbPathTagId,
            breadcrumbNodeId: breadcrumbNode.id,
          }
        : null;
    }

    if (isTableHeaderTarget(event)) return null;
    return pathTagId ? { kind: 'background', pathTagId } : null;
  };

  const handleFileDragEnter = (event: DragEvent<HTMLElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    fileDragDepthRef.current += 1;
    setActiveDropTarget(resolveDropTarget(event));
  };

  const handleFileDragOver = (event: DragEvent<HTMLElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    const target = resolveDropTarget(event);
    event.dataTransfer.dropEffect = target ? 'copy' : 'none';
    setActiveDropTarget(target);
  };

  const handleFileDragLeave = (event: DragEvent<HTMLElement>) => {
    if (!hasDraggedFiles(event)) return;
    fileDragDepthRef.current = Math.max(0, fileDragDepthRef.current - 1);
    if (fileDragDepthRef.current === 0) {
      setActiveDropTarget(null);
    }
  };

  const handleFileDrop = (event: DragEvent<HTMLElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    const target = resolveDropTarget(event);
    clearFileDragState();
    const files = Array.from(event.dataTransfer.files);
    if (target && files.length > 0) {
      queueDocuments(files, target.pathTagId);
    }
  };

  return {
    activeDropRowId: activeDropTarget?.kind === 'row' ? activeDropTarget.rowId : undefined,
    activeBreadcrumbNodeId:
      activeDropTarget?.kind === 'breadcrumb' ? activeDropTarget.breadcrumbNodeId : undefined,
    isBackgroundDropActive: activeDropTarget?.kind === 'background',
    bodyDragHandlers: {
      onDragEnter: handleFileDragEnter,
      onDragOver: handleFileDragOver,
      onDragLeave: handleFileDragLeave,
      onDrop: handleFileDrop,
    },
    breadcrumbDragHandlers: {
      onDragEnter: handleFileDragEnter,
      onDragOver: handleFileDragOver,
      onDragLeave: handleFileDragLeave,
      onDrop: handleFileDrop,
    },
    handleFileDragEnter,
    handleFileDragOver,
    handleFileDragLeave,
    handleFileDrop,
  };
}

function hasDraggedFiles(event: DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types).includes('Files');
}

function getTargetRow(
  event: DragEvent<HTMLElement>,
  rowMap: Map<string, DriveTableRow>
): DriveTableRow | undefined {
  if (!(event.target instanceof Element)) return undefined;
  const rowElement = event.target.closest<HTMLElement>('[data-folder-row-id]');
  if (!rowElement || !event.currentTarget.contains(rowElement)) return undefined;
  const rowId = rowElement.dataset.folderRowId;
  return rowId ? rowMap.get(rowId) : undefined;
}

function getTargetBreadcrumbNode(
  event: DragEvent<HTMLElement>,
  pathNodes: DriveNode[]
): DriveNode | undefined {
  if (!(event.target instanceof Element)) return undefined;
  const breadcrumbElement = event.target.closest<HTMLElement>('[data-drive-breadcrumb-node-id]');
  if (!breadcrumbElement || !event.currentTarget.contains(breadcrumbElement)) return undefined;
  const nodeId = breadcrumbElement.dataset.driveBreadcrumbNodeId;
  return nodeId ? pathNodes.find((node) => node.id === nodeId) : undefined;
}

function isTableHeaderTarget(event: DragEvent<HTMLElement>): boolean {
  return event.target instanceof Element && Boolean(event.target.closest('.table__header'));
}

function getNodePathTagId(node: DriveNode): string | undefined {
  if (node.type === 'folder') {
    return node.systemType ? undefined : node.tagId;
  }
  if (node.type === 'root' && node.canMountResources) {
    return node.tagId;
  }
  return undefined;
}
