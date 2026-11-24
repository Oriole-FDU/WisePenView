import { type SortDescriptor } from '@heroui/react';
import type { TFunction } from 'i18next';
import { useRef, useState } from 'react';

import { buildDriveNodeKey, type DriveTreeRuntime, type DriveTreeSnapshot } from '@/runtime/drive';

import {
  type DriveActionTarget,
  type DriveRow,
  isDriveActionTarget,
  isDriveSystemFolderNode,
} from '../../common/driveComponentModel';
import { buildDriveTableRowMap, toDriveTableRow } from '../tableConfig';

interface UseTableDriveInteractionParams {
  runtime: DriveTreeRuntime;
  snapshot: DriveTreeSnapshot;
  dataSource: DriveRow[];
  t: TFunction<'drive' | 'resource' | 'common'>;
}

export function useTableDriveInteraction({
  runtime,
  snapshot,
  dataSource,
  t,
}: UseTableDriveInteractionParams) {
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>();
  const lastSortClickRef = useRef<{ column: string; time: number } | null>(null);

  const rows = dataSource.map((node) => toDriveTableRow(node, t));
  const rowMap = buildDriveTableRowMap(rows);
  const primaryScope = snapshot.request.scope;
  const checkedRowKeys = new Set(
    [...snapshot.checkedKeys]
      .map((nodeKey) => snapshot.nodeByKey.get(nodeKey))
      .filter(
        (node): node is NonNullable<typeof node> => node?.scope.rootId === primaryScope.rootId
      )
      .map((node) => node.id)
  );
  const selectedNodeKey = snapshot.selectedKeys.values().next().value as string | undefined;
  const selectedNode = selectedNodeKey ? snapshot.nodeByKey.get(selectedNodeKey) : undefined;
  const selectedRowId =
    selectedNode?.scope.rootId === primaryScope.rootId ? selectedNode.id : undefined;
  const selectedRow = selectedRowId ? rowMap.get(selectedRowId) : undefined;
  const selectedActionTargets: DriveActionTarget[] = [];
  checkedRowKeys.forEach((rowId) => {
    const node = rowMap.get(rowId)?.node;
    if (node && isDriveActionTarget(node) && !isDriveSystemFolderNode(node)) {
      selectedActionTargets.push(node);
    }
  });
  const selectedActionTargetKeys = new Set(selectedActionTargets.map((node) => node.id));
  const canMoveSelection = selectedActionTargets.length > 0;
  const systemRowKeys = new Set(
    [...rowMap.values()].filter((row) => isDriveSystemFolderNode(row.node)).map((row) => row.id)
  );

  const clearChecked = () => runtime.clearChecked();
  const clearSelectedRow = () => runtime.selectNode(null);
  const setCheckedRowKeys = (keys: Set<string>) =>
    runtime.setCheckedNodeKeys([...keys].map((rowId) => buildDriveNodeKey(primaryScope, rowId)));
  const setSelectedRowId = (rowId?: string) =>
    runtime.selectNode(rowId ? buildDriveNodeKey(primaryScope, rowId) : null);
  const setIsDetailPanelCollapsed = (next: boolean | ((collapsed: boolean) => boolean)) => {
    runtime.setDetailPanelCollapsed(
      typeof next === 'function' ? next(snapshot.detailPanelCollapsed) : next
    );
  };
  const handleSortChange = (descriptor: SortDescriptor) => {
    const now = Date.now();
    const column = String(descriptor.column);
    const last = lastSortClickRef.current;
    if (last && last.column === column && now - last.time < 300) {
      lastSortClickRef.current = null;
      setSortDescriptor(undefined);
      return;
    }
    lastSortClickRef.current = { column, time: now };
    setSortDescriptor(descriptor);
  };

  return {
    canMoveSelection,
    checkedRowKeys,
    clearSelectedRow,
    clearChecked,
    handleSortChange,
    isDetailPanelCollapsed: snapshot.detailPanelCollapsed,
    rowMap,
    rows,
    selectedActionTargets,
    selectedActionTargetKeys,
    selectedRow,
    setCheckedRowKeys,
    setIsDetailPanelCollapsed,
    setSelectedRowId,
    systemRowKeys,
    sortDescriptor,
  };
}
