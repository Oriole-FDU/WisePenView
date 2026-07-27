import type { FolderTableBreadcrumbItem } from '@/components/Table';
import { useDriveService } from '@/domains';
import type { DriveNode } from '@/domains/Drive';
import { parseErrorMessage } from '@/utils/error';
import {
  MouseSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isDriveActionTarget, isDriveSharedFolderNode } from '../common/driveComponentModel';
import type { DriveTableRow } from './index.type';
import { DriveDndNameContent, DriveDroppableBreadcrumb } from './parts/DriveDnd';

interface UseTableDriveDndParams {
  rowMap: Map<string, DriveTableRow>;
  pathNodes: DriveNode[];
  checkedRowKeys: Set<string>;
  groupId?: string;
  onMoveSuccess: () => void;
}

function isDriveDragSource(row: DriveTableRow): boolean {
  return isDriveActionTarget(row.node) && !isDriveSharedFolderNode(row.node);
}

function isDriveMoveTarget(node: DriveNode): boolean {
  return (node.type === 'folder' || node.type === 'root') && !isDriveSharedFolderNode(node);
}

function buildDriveNodeMap(
  rowMap: Map<string, DriveTableRow>,
  pathNodes: DriveNode[]
): Map<string, DriveNode> {
  const nodeMap = new Map<string, DriveNode>();
  rowMap.forEach((row) => {
    nodeMap.set(row.node.id, row.node);
  });
  pathNodes.forEach((node) => {
    nodeMap.set(node.id, node);
  });
  return nodeMap;
}

function resolveDragSourceIds(
  row: DriveTableRow,
  checkedRowKeys: Set<string>,
  rowMap: Map<string, DriveTableRow>
): string[] {
  if (!isDriveDragSource(row)) {
    return [];
  }

  const sourceIds = checkedRowKeys.has(row.id) ? [...checkedRowKeys] : [row.id];
  return sourceIds.filter((rowId) => {
    const sourceRow = rowMap.get(rowId);
    return sourceRow ? isDriveDragSource(sourceRow) : false;
  });
}

export function useTableDriveDnd({
  rowMap,
  pathNodes,
  checkedRowKeys,
  groupId,
  onMoveSuccess,
}: UseTableDriveDndParams) {
  const { t } = useTranslation('drive');
  const driveService = useDriveService();
  const [draggingRowKeys, setDraggingRowKeys] = useState<Set<string>>(new Set());
  const [activeDragRowId, setActiveDragRowId] = useState<string | null>(null);
  const draggingRowKeysRef = useRef<Set<string>>(new Set());
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const driveNodeMap = buildDriveNodeMap(rowMap, pathNodes);
  const activeDragRow = activeDragRowId ? rowMap.get(activeDragRowId) : undefined;
  const draggingCount = draggingRowKeys.size;

  const clearDragState = () => {
    draggingRowKeysRef.current = new Set();
    setDraggingRowKeys(new Set());
    setActiveDragRowId(null);
  };

  const { loading: movingByDrag, run: runMoveRowsByDrag } = useRequest(
    async ({
      sourceRowIds,
      targetFolderNodeId,
    }: {
      sourceRowIds: string[];
      targetFolderNodeId: string;
    }) => {
      return driveService.moveNodesToFolder({
        nodeIds: sourceRowIds,
        targetFolderNodeId,
        groupId,
      });
    },
    {
      manual: true,
      onSuccess: (movedCount) => {
        if (movedCount === 0) return;

        onMoveSuccess();
        if (movedCount > 1) {
          toast.success(t('move.feedback.moved', { count: movedCount }));
        } else if (movedCount === 1) {
          toast.success(t('table.movedSingle'));
        }
      },
      onError: (error) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const handleDragStart = (event: DragStartEvent) => {
    const rowId = event.active.data.current?.rowId;
    if (typeof rowId !== 'string' || movingByDrag) return;

    const row = rowMap.get(rowId);
    if (!row) return;

    const sourceRowIds = resolveDragSourceIds(row, checkedRowKeys, rowMap);
    if (sourceRowIds.length === 0) return;

    const nextDraggingRowKeys = new Set(sourceRowIds);
    draggingRowKeysRef.current = nextDraggingRowKeys;
    setDraggingRowKeys(nextDraggingRowKeys);
    setActiveDragRowId(row.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const targetNodeId = event.over?.data.current?.targetNodeId;
    const sourceRowIds = [...draggingRowKeysRef.current];
    const targetNode =
      typeof targetNodeId === 'string' ? driveNodeMap.get(targetNodeId) : undefined;

    if (
      targetNode &&
      isDriveMoveTarget(targetNode) &&
      sourceRowIds.length > 0 &&
      !sourceRowIds.includes(targetNode.id)
    ) {
      runMoveRowsByDrag({
        sourceRowIds,
        targetFolderNodeId: targetNode.id,
      });
    }

    clearDragState();
  };

  const renderBreadcrumbItem = (content: ReactNode, item: FolderTableBreadcrumbItem) => {
    const targetNode = driveNodeMap.get(item.id);
    if (!targetNode) return content;

    return (
      <DriveDroppableBreadcrumb
        targetNodeId={targetNode.id}
        disabled={movingByDrag || draggingCount === 0 || !isDriveMoveTarget(targetNode)}
      >
        {content}
      </DriveDroppableBreadcrumb>
    );
  };

  const renderNameContent = (content: ReactNode, row: DriveTableRow) => (
    <DriveDndNameContent
      row={row}
      draggableDisabled={movingByDrag || !isDriveDragSource(row)}
      droppableDisabled={movingByDrag || draggingCount === 0 || !isDriveMoveTarget(row.node)}
    >
      {content}
    </DriveDndNameContent>
  );

  return {
    sensors,
    draggingCount,
    activeDragRow,
    clearDragState,
    handleDragStart,
    handleDragEnd,
    renderBreadcrumbItem,
    renderNameContent,
  };
}
