import {
  type DragEndEvent,
  type DragStartEvent,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { toast } from '@heroui/react';
import { type ReactElement, type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AppBreadcrumbItem } from '@/components/base/AppBreadcrumb';
import { useDriveService } from '@/domains';
import type { DriveNode } from '@/domains/Drive';
import { useApi } from '@/hooks/useApi';

import {
  type DriveViewNode,
  isDriveActionTarget,
  isDriveSharedFolderNode,
} from '../../common/driveComponentModel';
import type { DriveTableRow } from '../index.type';
import { DriveDndRow, DriveDroppableBreadcrumb } from '../parts/DriveDnd';

interface UseTableDriveDndControllerParams {
  rowMap: Map<string, DriveTableRow>;
  pathNodes: DriveNode[];
  checkedRowKeys: Set<string>;
  onMoveSuccess: () => void;
  onMoveError?: () => void;
}

/** 判断表格行是否允许作为拖拽源。 */
function isDriveDragSource(row: DriveTableRow): boolean {
  return isDriveActionTarget(row.node) && !isDriveSharedFolderNode(row.node);
}

/** 判断节点是否允许作为移动目标。 */
function isDriveMoveTarget(
  node: DriveViewNode
): node is Extract<DriveNode, { type: 'root' | 'folder' }> {
  return (node.type === 'folder' || node.type === 'root') && !isDriveSharedFolderNode(node);
}

/** 合并表格行和当前路径节点，构建拖拽目标查询索引。 */
function buildDriveNodeMap(
  rowMap: Map<string, DriveTableRow>,
  pathNodes: DriveNode[]
): Map<string, DriveViewNode> {
  const nodeMap = new Map<string, DriveViewNode>();
  rowMap.forEach((row) => {
    nodeMap.set(row.node.id, row.node);
  });
  pathNodes.forEach((node) => {
    nodeMap.set(node.id, node);
  });
  return nodeMap;
}

export function useTableDriveDndController({
  rowMap,
  pathNodes,
  checkedRowKeys,
  onMoveSuccess,
  onMoveError,
}: UseTableDriveDndControllerParams) {
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

  const { loading: movingByDrag, run: runMoveRowsByDrag } = useApi(
    async ({
      sourceRowIds,
      targetFolderNodeId,
    }: {
      sourceRowIds: string[];
      targetFolderNodeId: string;
    }) => {
      const nodes = sourceRowIds
        .map((nodeId) => rowMap.get(nodeId)?.node)
        .filter(
          (node): node is Extract<DriveNode, { type: 'folder' | 'resource' | 'link' }> =>
            node != null && isDriveActionTarget(node)
        );
      const target = driveNodeMap.get(targetFolderNodeId);
      if (!target || !isDriveMoveTarget(target)) {
        return { requestedCount: 0, affectedCount: 0 };
      }
      return driveService.moveNodes({ nodes, target });
    },
    {
      manual: true,
      onSuccess: ({ affectedCount: movedCount }) => {
        if (movedCount === 0) return;

        onMoveSuccess();
        if (movedCount > 1) {
          toast.success(t('move.feedback.moved', { count: movedCount }));
        } else if (movedCount === 1) {
          toast.success(t('table.movedSingle'));
        }
      },
      onErrorEffect: () => {
        onMoveError?.();
      },
    }
  );

  const handleDragStart = (event: DragStartEvent) => {
    const rowId = event.active.data.current?.rowId;
    if (typeof rowId !== 'string' || movingByDrag) return;

    const row = rowMap.get(rowId);
    if (!row) return;

    if (!isDriveDragSource(row)) return;

    const selectedSourceRowIds = checkedRowKeys.has(row.id) ? [...checkedRowKeys] : [row.id];
    const sourceRowIds = selectedSourceRowIds.filter((sourceRowId) => {
      const sourceRow = rowMap.get(sourceRowId);
      return sourceRow ? isDriveDragSource(sourceRow) : false;
    });
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

  const renderBreadcrumbItem = (content: ReactNode, item: AppBreadcrumbItem) => {
    const targetNode = driveNodeMap.get(item.key);
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

  const renderRow = (rowElement: ReactElement, row: DriveTableRow) => (
    <DriveDndRow
      row={row}
      draggableDisabled={movingByDrag || !isDriveDragSource(row)}
      droppableDisabled={movingByDrag || draggingCount === 0 || !isDriveMoveTarget(row.node)}
    >
      {rowElement}
    </DriveDndRow>
  );

  const renderNameContent = (content: ReactNode, _row: DriveTableRow) => content;

  return {
    sensors,
    draggingCount,
    activeDragRow,
    clearDragState,
    handleDragStart,
    handleDragEnd,
    renderBreadcrumbItem,
    renderRow,
    renderNameContent,
  };
}
