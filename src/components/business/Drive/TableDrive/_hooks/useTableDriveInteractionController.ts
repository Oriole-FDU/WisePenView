import { type SortDescriptor } from '@heroui/react';
import type { TFunction } from 'i18next';
import { useRef, useState } from 'react';

import {
  type DriveActionTarget,
  isDriveActionTarget,
  isDriveSystemFolderNode,
} from '../../_common/driveComponentModel';
import { buildDriveTableRowMap, toDriveTableRow } from '../_common/tableConfig';
import type { DriveRow } from '../index.type';

interface UseTableDriveInteractionControllerParams {
  dataSource: DriveRow[];
  t: TFunction<'drive' | 'resource' | 'common'>;
}

export function useTableDriveInteractionController({
  dataSource,
  t,
}: UseTableDriveInteractionControllerParams) {
  const [checkedRowKeys, setCheckedRowKeys] = useState<Set<string>>(new Set());
  const [selectedRowId, setSelectedRowId] = useState<string>();
  const [isDetailPanelCollapsed, setIsDetailPanelCollapsed] = useState(true);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>();
  const lastSortClickRef = useRef<{ column: string; time: number } | null>(null);

  const rows = dataSource.map((node) => toDriveTableRow(node, t));
  const rowMap = buildDriveTableRowMap(rows);
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

  const clearChecked = () => setCheckedRowKeys(new Set());
  const clearSelectedRow = () => setSelectedRowId(undefined);
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
    isDetailPanelCollapsed,
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
