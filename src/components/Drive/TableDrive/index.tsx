import {
  DriveDelete,
  MoveNodeModal,
  RenameNodeModal,
  TrashDelete,
} from '@/components/Drive/Modals';
import EntryIcon from '@/components/Icons/EntryIcon';
import {
  FolderTable,
  type FolderTableBreadcrumbItem,
  type FolderTableColumn,
  type FolderTableRowAction,
  type FolderTableRowPressContext,
} from '@/components/Table';
import { useDriveService } from '@/domains';
import type { DriveNode } from '@/domains/Drive';
import SidebarDriveScopeSwitcher from '@/layouts/_common/Sidebar/DriveSidebar/_components/SidebarDrive/SidebarDriveScopeSwitcher';
import { parseErrorMessage } from '@/utils/error';
import { formatFileSize } from '@/utils/format/formatFileSize';
import { findTreeNodeById } from '@/utils/tree/findTreeNodeById';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Button, toast, type Selection, type SortDescriptor } from '@heroui/react';
import { useMount, useRequest, useUnmount, useUpdateEffect } from 'ahooks';
import { Trash2 } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  getDriveNodeLabel,
  isDriveActionTarget,
  isDriveSharedFolderNode,
  isDriveSystemFolderNode,
  resolveCurrentFolderTagId,
  resolveDriveScope,
  type DriveActionTarget,
} from '../common/driveComponentModel';
import { useClickNode } from '../common/useClickNode';
import type { DriveRow, DriveTableRow, TableDriveHandle, TableDriveProps } from './index.type';
import CreateMenu from './parts/CreateMenu';
import TableDriveSelectionPanel from './parts/SelectionPanel';
import styles from './style.module.less';
import { useTableDrive } from './useTableDrive';
import { useTableDriveActions } from './useTableDriveActions';

const DRIVE_TABLE_COLUMNS: FolderTableColumn<DriveTableRow>[] = [
  {
    id: 'name',
    label: '名称',
    width: 'fill',
    align: 'start',
    isRowHeader: true,
    isNameColumn: true,
    allowsSorting: true,
    sortFolderGroup: true,
    getSortValue: (row) => row.name,
  },
  {
    id: 'size',
    label: '大小',
    width: 'folderSize',
    renderCell: (row) => (row.entryType === 'loading' ? '' : (row.sizeLabel ?? '—')),
  },
  {
    id: 'type',
    label: '类型',
    width: 'folderType',
    allowsSorting: true,
    getSortValue: (row) => row.typeLabel,
    renderCell: (row) => (row.entryType === 'loading' ? '' : row.typeLabel),
  },
  {
    id: 'actions',
    label: '操作',
    width: 'folderAction',
    isActionColumn: true,
  },
];

function getTypeLabel(node: DriveNode): string {
  switch (node.type) {
    case 'root':
      return '云盘';
    case 'folder':
      return '文件夹';
    case 'resource':
      return node.resourceType ?? '资源';
    case 'link':
      return '链接';
    case 'loading':
      return '';
  }
}

function formatDriveNodeSizeLabel(node: DriveNode): string {
  if (node.type !== 'resource' && node.type !== 'link') {
    return '—';
  }
  return node.size == null ? '—' : formatFileSize(node.size);
}

function toDriveTableRow(node: DriveRow): DriveTableRow {
  if (node.type === 'loading') {
    return {
      id: node.id,
      name: node.label || '正在加载...',
      entryType: 'loading',
      typeLabel: '',
      node,
    };
  }

  return {
    id: node.id,
    name: getDriveNodeLabel(node),
    entryType: node.type,
    folderIconType: isDriveSharedFolderNode(node) ? 'shared' : undefined,
    resourceType: node.type === 'resource' ? node.resourceType : undefined,
    resourceIconType:
      node.type === 'resource' || node.type === 'link' ? node.resourceIconType : undefined,
    sizeLabel: formatDriveNodeSizeLabel(node),
    typeLabel: getTypeLabel(node),
    isExpandable: node.type === 'root' || node.type === 'folder',
    children: node.children?.map((child) => toDriveTableRow(child)),
    node,
  };
}

function toBreadcrumbItems(pathNodes: DriveNode[]): FolderTableBreadcrumbItem[] {
  return pathNodes
    .filter((node) => node.type !== 'loading')
    .map((node, index) => ({
      id: node.id,
      label: getDriveNodeLabel(node),
      isRoot: index === 0,
    }));
}

function buildDriveTableRowMap(rows: DriveTableRow[]): Map<string, DriveTableRow> {
  const map = new Map<string, DriveTableRow>();
  const visit = (row: DriveTableRow) => {
    map.set(row.id, row);
    row.children?.forEach(visit);
  };
  rows.forEach(visit);
  return map;
}

function toDriveActionTarget(node: DriveNode): DriveActionTarget | null {
  return isDriveActionTarget(node) ? node : null;
}

function isDriveDragSource(row: DriveTableRow): boolean {
  return isDriveActionTarget(row.node);
}

function isDriveMoveTarget(row: DriveTableRow): boolean {
  return isDriveMoveTargetNode(row.node);
}

function isDriveMoveTargetNode(node: DriveNode): boolean {
  return node.type === 'folder' || node.type === 'root';
}

function isDrivePinnedFirstRow(row: DriveTableRow): boolean {
  return isDriveSharedFolderNode(row.node);
}

interface DriveDndNameContentProps {
  row: DriveTableRow;
  draggableDisabled: boolean;
  droppableDisabled: boolean;
  children: ReactNode;
}

function DriveDndNameContent({
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
  const setNodeRef = useCallback(
    (node: HTMLElement | null) => {
      setDraggableNodeRef(node);
      setActivatorNodeRef(node);
      setDroppableNodeRef(node?.closest<HTMLElement>('[data-folder-row-id]') ?? null);
    },
    [setActivatorNodeRef, setDraggableNodeRef, setDroppableNodeRef]
  );

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
  targetNode: DriveNode;
  disabled: boolean;
  children: ReactNode;
}

function DriveDroppableBreadcrumb({
  targetNode,
  disabled,
  children,
}: DriveDroppableBreadcrumbProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `drive-breadcrumb:${targetNode.id}`,
    disabled,
    data: { targetNodeId: targetNode.id },
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

function DriveDragOverlay({ row, count }: { row: DriveTableRow; count: number }) {
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
      <span className={styles.dragOverlayCount}>共选中 {count} 项</span>
    </div>
  );
}

function resolveSelectionKeysAfterRowPress(
  currentKeys: Set<string>,
  rowId: string,
  ctx: FolderTableRowPressContext
): Set<string> {
  if (!ctx.modifierKey) {
    return new Set([rowId]);
  }

  const nextKeys = new Set(currentKeys);
  if (nextKeys.has(rowId)) {
    nextKeys.delete(rowId);
    return nextKeys;
  }
  nextKeys.add(rowId);
  return nextKeys;
}

const TableDrive = forwardRef<TableDriveHandle, TableDriveProps>(function TableDrive(
  {
    groupId,
    rootId,
    initialNodeId,
    scope,
    actions,
    onTrashViewChange,
    onUploadSuccess,
    showToolbarTrash = true,
  },
  ref
) {
  const driveService = useDriveService();
  const resolvedScope = useMemo(
    () => resolveDriveScope(scope, groupId, rootId),
    [scope, groupId, rootId]
  );
  const finalRootId = resolvedScope.rootId;
  const finalGroupId = resolvedScope.groupId;
  const {
    currentNodeId,
    dataSource,
    pathNodes,
    loading,
    expandedRowKeys,
    enterFolder,
    handleExpand,
    refresh,
  } = useTableDrive({
    initialNodeId,
    scope: resolvedScope.scope,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const [draggingRowKeys, setDraggingRowKeys] = useState<Set<string>>(new Set());
  const [activeDragRowId, setActiveDragRowId] = useState<string | null>(null);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor | undefined>();
  const lastSortClickRef = useRef<{ column: string; time: number } | null>(null);

  const handleSortChange = useCallback((descriptor: SortDescriptor) => {
    const now = Date.now();
    const last = lastSortClickRef.current;

    if (last && last.column === descriptor.column && now - last.time < 300) {
      // 双击同一列 → 回到默认未排序状态
      lastSortClickRef.current = null;
      setSortDescriptor(undefined);
      return;
    }

    lastSortClickRef.current = { column: descriptor.column, time: now };
    setSortDescriptor(descriptor);
  }, []);
  const [renameTarget, setRenameTarget] = useState<DriveActionTarget | null>(null);
  const [moveTarget, setMoveTarget] = useState<DriveActionTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriveActionTarget | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const beforeTrashNodeIdRef = useRef<string | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doubleClickRef = useRef(false);

  useUnmount(() => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }
  });
  const draggingRowKeysRef = useRef<Set<string>>(new Set());
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const updateDraggingRowKeys = useCallback((keys: Set<string>) => {
    draggingRowKeysRef.current = keys;
    setDraggingRowKeys(keys);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedRowKeys(new Set());
  }, []);

  const refreshDrive = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleEnterFolder = useCallback(
    (nodeId: string) => {
      setSelectedRowKeys(new Set());
      updateDraggingRowKeys(new Set());
      setActiveDragRowId(null);
      enterFolder(nodeId);
    },
    [enterFolder, updateDraggingRowKeys]
  );
  const handleClickNode = useClickNode({
    enterFolder: handleEnterFolder,
  });
  const rows = useMemo(() => dataSource.map((node) => toDriveTableRow(node)), [dataSource]);
  const rowMap = useMemo(() => buildDriveTableRowMap(rows), [rows]);
  const driveNodeMap = useMemo(() => {
    const map = new Map<string, DriveNode>();
    rowMap.forEach((row) => {
      map.set(row.node.id, row.node);
    });
    pathNodes.forEach((node) => {
      map.set(node.id, node);
    });
    return map;
  }, [pathNodes, rowMap]);

  const handleToggleBatchMode = useCallback(() => {
    setBatchMode((prev) => {
      if (prev) {
        setSelectedRowKeys(new Set());
      }
      return !prev;
    });
  }, []);

  const handleBatchSelectionChange = useCallback(
    (keys: Selection) => {
      if (keys === 'all') {
        const allIds = rows.filter((r) => r.entryType !== 'loading').map((r) => r.id);
        setSelectedRowKeys(new Set(allIds));
        return;
      }
      setSelectedRowKeys(new Set([...keys].map(String)));
    },
    [rows]
  );

  const { loading: batchDeleting, run: runBatchDelete } = useRequest(
    async () => {
      const ids = [...selectedRowKeys];
      await Promise.all(
        ids.map((nodeId) => driveService.removeNode({ nodeId, groupId: finalGroupId }))
      );
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(`已删除 ${selectedRowKeys.size} 项`);
        setSelectedRowKeys(new Set());
        setBatchMode(false);
        refreshDrive();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const batchSelection = useMemo(() => {
    if (!batchMode) return undefined;
    return {
      selectedKeys: selectedRowKeys as Set<string | number>,
      onSelectionChange: handleBatchSelectionChange,
    };
  }, [batchMode, selectedRowKeys, handleBatchSelectionChange]);

  const batchFooter = useMemo(() => {
    if (!batchMode) return null;
    return (
      <div className={styles.batchFooter}>
        <div className={styles.batchActions}>
          <Button
            variant="danger"
            size="sm"
            isDisabled={selectedRowKeys.size === 0 || batchDeleting}
            onPress={() => runBatchDelete()}
          >
            删除
          </Button>
          <Button variant="secondary" size="sm" onPress={handleToggleBatchMode}>
            取消
          </Button>
        </div>
      </div>
    );
  }, [batchMode, selectedRowKeys, batchDeleting, runBatchDelete, handleToggleBatchMode]);

  const selectedNode = useMemo(() => {
    if (selectedRowKeys.size !== 1) {
      return undefined;
    }
    return rowMap.get(selectedRowKeys.values().next().value ?? '');
  }, [rowMap, selectedRowKeys]);
  const activeDragRow = useMemo(
    () => (activeDragRowId ? rowMap.get(activeDragRowId) : undefined),
    [activeDragRowId, rowMap]
  );
  const currentDirectoryItemCount = useMemo(
    () => rows.filter((row) => row.entryType !== 'loading').length,
    [rows]
  );

  const handleNodeActionSuccess = useCallback(() => {
    handleClearSelection();
    refreshDrive();
  }, [handleClearSelection, refreshDrive]);

  const handleOpenRename = useCallback((node: DriveActionTarget) => {
    setRenameTarget(node);
  }, []);

  const handleOpenMove = useCallback((node: DriveActionTarget) => {
    setMoveTarget(node);
  }, []);

  const handleOpenDelete = useCallback((node: DriveActionTarget) => {
    setDeleteTarget(node);
  }, []);

  const handleDeleteModalOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

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
        groupId: finalGroupId,
      });
    },
    {
      manual: true,
      onSuccess: (movedCount) => {
        if (movedCount === 0) {
          return;
        }
        handleClearSelection();
        refreshDrive();
        if (movedCount > 1) {
          toast.success(`已移动 ${movedCount} 项`);
        } else if (movedCount === 1) {
          toast.success('已移动');
        }
      },
      onError: (error) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const canOpenTrash = !finalGroupId;
  const { data: trashFolderNodeId, runAsync: resolveTrashFolderNodeId } = useRequest(
    () => driveService.getTrashFolderNodeId(finalGroupId),
    {
      ready: canOpenTrash,
      refreshDeps: [finalGroupId],
    }
  );
  const isTrashView = Boolean(
    canOpenTrash &&
    trashFolderNodeId &&
    (currentNodeId === trashFolderNodeId ||
      pathNodes.some((pathNode) => pathNode.id === trashFolderNodeId))
  );

  const openTrash = useCallback(async () => {
    if (!canOpenTrash) {
      return;
    }

    // 已在回收站 → 返回之前的目录
    if (isTrashView) {
      handleEnterFolder(beforeTrashNodeIdRef.current ?? finalRootId);
      beforeTrashNodeIdRef.current = null;
      return;
    }

    try {
      const resolvedTrashFolderNodeId = trashFolderNodeId ?? (await resolveTrashFolderNodeId());
      if (!resolvedTrashFolderNodeId) {
        toast.danger('未找到回收站');
        return;
      }
      beforeTrashNodeIdRef.current = currentNodeId;
      handleEnterFolder(resolvedTrashFolderNodeId);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  }, [
    canOpenTrash,
    currentNodeId,
    finalRootId,
    handleEnterFolder,
    isTrashView,
    resolveTrashFolderNodeId,
    trashFolderNodeId,
  ]);

  useImperativeHandle(ref, () => ({ openTrash }), [openTrash]);

  useMount(() => {
    onTrashViewChange?.(isTrashView);
  });

  useUpdateEffect(() => {
    onTrashViewChange?.(isTrashView);
  }, [isTrashView, onTrashViewChange]);

  const targetTagId = useMemo(
    () => resolveCurrentFolderTagId(currentNodeId, pathNodes),
    [currentNodeId, pathNodes]
  );
  const breadcrumbItems = useMemo(() => toBreadcrumbItems(pathNodes), [pathNodes]);
  const {
    showCreateMenu,
    showUploadToGroup,
    showManagePermission,
    createMenuItems,
    handleCreateMenuSelect,
    openUploadToGroup,
    openTagAccessPermission,
    openTagMountPermission,
    openResourcePermission,
    tagPermissionRefreshToken,
    resourcePermissionRefreshToken,
    ModalHost,
  } = useTableDriveActions({
    currentNodeId,
    currentRows: rows,
    scope: resolvedScope.scope,
    actions,
    refresh: refreshDrive,
    onUploadSuccess,
    targetTagId,
    isTrashView,
  });
  const toolbar = useMemo(
    () => (
      <div className={styles.toolbarActions}>
        {showCreateMenu ? (
          <CreateMenu items={createMenuItems} onSelect={handleCreateMenuSelect} />
        ) : null}
        {showUploadToGroup ? (
          <Button variant="secondary" size="sm" onPress={openUploadToGroup}>
            上传到小组
          </Button>
        ) : null}
        {!isTrashView ? (
          <Button
            variant={batchMode ? 'primary' : 'secondary'}
            size="sm"
            onPress={handleToggleBatchMode}
          >
            批量操作
          </Button>
        ) : null}
        {showToolbarTrash && canOpenTrash ? (
          <Button variant={isTrashView ? 'primary' : 'secondary'} size="sm" onPress={openTrash}>
            <Trash2 size={16} aria-hidden="true" />
            {isTrashView ? '返回云盘' : '回收站'}
          </Button>
        ) : null}
      </div>
    ),
    [
      batchMode,
      createMenuItems,
      handleCreateMenuSelect,
      handleToggleBatchMode,
      isTrashView,
      openUploadToGroup,
      openTrash,
      canOpenTrash,
      showCreateMenu,
      showUploadToGroup,
      showToolbarTrash,
    ]
  );

  const handleExpandedChange = useCallback(
    async (keys: string[]) => {
      const addedKey = keys.find((key) => !expandedRowKeys.includes(key));
      if (addedKey) {
        const row = findTreeNodeById(dataSource, addedKey);
        if (row) {
          await handleExpand(true, row);
          return;
        }
      }
      const removedKey = expandedRowKeys.find((key) => !keys.includes(key));
      if (removedKey) {
        const row = findTreeNodeById(dataSource, removedKey);
        if (row) {
          await handleExpand(false, row);
          return;
        }
      }
    },
    [dataSource, expandedRowKeys, handleExpand]
  );

  const handleRowActivate = useCallback(
    (row: DriveTableRow) => {
      handleClickNode(row.node);
    },
    [handleClickNode]
  );

  const resolveRowActions = useCallback(
    (row: DriveTableRow): FolderTableRowAction<DriveTableRow>[] => {
      if (batchMode) return [];
      const actionTarget = toDriveActionTarget(row.node);
      if (!actionTarget) return [];

      const openAction: FolderTableRowAction<DriveTableRow> =
        row.node.type === 'folder'
          ? {
              key: 'enter',
              label: '进入',
              onPress: () => handleEnterFolder(row.node.id),
            }
          : {
              key: 'open',
              label: '打开',
              onPress: () => handleClickNode(row.node),
            };

      const actions: FolderTableRowAction<DriveTableRow>[] = [openAction];

      if (isDriveSystemFolderNode(actionTarget)) {
        return actions;
      }

      if (actionTarget.type !== 'link') {
        actions.push({
          key: 'rename',
          label: '重命名',
          onPress: () => handleOpenRename(actionTarget),
        });
      }

      actions.push(
        {
          key: 'move',
          label: isTrashView ? '移动到云盘' : '移动',
          onPress: () => handleOpenMove(actionTarget),
        },
        {
          key: 'delete',
          label:
            finalGroupId != null
              ? '移除'
              : isTrashView
                ? '永久删除'
                : actionTarget.type === 'link'
                  ? '删除链接'
                  : '移入回收站',
          variant: 'danger',
          onPress: () => handleOpenDelete(actionTarget),
        }
      );

      return actions;
    },
    [
      batchMode,
      finalGroupId,
      handleClickNode,
      handleEnterFolder,
      handleOpenDelete,
      handleOpenMove,
      handleOpenRename,
      isTrashView,
    ]
  );

  const handleRowSelect = useCallback(
    (row: DriveTableRow, ctx: FolderTableRowPressContext) => {
      if (row.node.type === 'loading') return;

      // 清除上一次单击的待激活定时器
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }

      // 已选中行单击：延迟激活，留给系统双击检测窗口
      // 若在延迟内触发 dblclick 事件，handleDoubleClick 会标记 doubleClickRef 并取消激活
      if (!ctx.modifierKey && selectedRowKeys.size === 1 && selectedRowKeys.has(row.id)) {
        doubleClickRef.current = false;
        clickTimerRef.current = setTimeout(() => {
          clickTimerRef.current = null;
          if (!doubleClickRef.current) {
            handleRowActivate(row);
          }
        }, 550);
        return;
      }

      const nextSelectedRowKeys = resolveSelectionKeysAfterRowPress(selectedRowKeys, row.id, ctx);
      setSelectedRowKeys(nextSelectedRowKeys);
    },
    [handleRowActivate, selectedRowKeys]
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (batchMode) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const rowEl = target.closest<HTMLElement>('[data-folder-row-id]');
      if (!rowEl) return;
      const rowId = rowEl.getAttribute('data-folder-row-id');
      if (!rowId) return;

      const tableRow = rowMap.get(rowId);
      if (!tableRow || tableRow.entryType === 'loading') return;

      // 标记双击已发生，阻止 handleRowSelect 中的定时器激活
      doubleClickRef.current = true;
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }

      // 双击文件名 → 重命名；双击其他区域 → 打开/进入
      const isNameColumn = target.closest('[data-name-column="true"]') !== null;
      if (isNameColumn && !isDriveSystemFolderNode(tableRow.node)) {
        const actionTarget = toDriveActionTarget(tableRow.node);
        if (actionTarget && actionTarget.type !== 'link') {
          handleOpenRename(actionTarget);
          return;
        }
      }
      handleRowActivate(tableRow);
    },
    [batchMode, rowMap, handleOpenRename, handleRowActivate]
  );

  const resolveDragSourceIds = useCallback(
    (row: DriveTableRow): string[] => {
      if (!isDriveDragSource(row)) {
        return [];
      }
      const sourceIds = selectedRowKeys.has(row.id) ? [...selectedRowKeys] : [row.id];
      return sourceIds.filter((rowId) => {
        const sourceRow = rowMap.get(rowId);
        return sourceRow ? isDriveDragSource(sourceRow) : false;
      });
    },
    [rowMap, selectedRowKeys]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const rowId = event.active.data.current?.rowId;
      if (typeof rowId !== 'string') {
        return;
      }
      const row = rowMap.get(rowId);
      if (!row) {
        return;
      }
      const sourceRowIds = resolveDragSourceIds(row);
      if (sourceRowIds.length === 0 || movingByDrag) {
        return;
      }

      const nextDraggingRowKeys = new Set(sourceRowIds);
      updateDraggingRowKeys(nextDraggingRowKeys);
      setActiveDragRowId(row.id);
      if (!selectedRowKeys.has(row.id)) {
        setSelectedRowKeys(nextDraggingRowKeys);
      }
    },
    [movingByDrag, resolveDragSourceIds, rowMap, selectedRowKeys, updateDraggingRowKeys]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const targetNodeId = event.over?.data.current?.targetNodeId;
      const sourceRowIds = [...draggingRowKeysRef.current];
      const targetNode =
        typeof targetNodeId === 'string' ? driveNodeMap.get(targetNodeId) : undefined;

      if (targetNode && sourceRowIds.length > 0) {
        runMoveRowsByDrag({
          sourceRowIds,
          targetFolderNodeId: targetNode.id,
        });
      }

      updateDraggingRowKeys(new Set());
      setActiveDragRowId(null);
    },
    [driveNodeMap, runMoveRowsByDrag, updateDraggingRowKeys]
  );

  const handleDragCancel = useCallback(() => {
    updateDraggingRowKeys(new Set());
    setActiveDragRowId(null);
  }, [updateDraggingRowKeys]);

  const renderBreadcrumbItem = useCallback(
    (content: ReactNode, item: FolderTableBreadcrumbItem) => {
      const targetNode = driveNodeMap.get(item.id);
      if (!targetNode) {
        return content;
      }
      return (
        <DriveDroppableBreadcrumb
          targetNode={targetNode}
          disabled={movingByDrag || draggingRowKeys.size === 0}
        >
          {content}
        </DriveDroppableBreadcrumb>
      );
    },
    [draggingRowKeys.size, driveNodeMap, movingByDrag]
  );

  const breadcrumb = useMemo(
    () => (
      <>
        <FolderTable.Breadcrumb
          items={breadcrumbItems}
          onJump={handleEnterFolder}
          renderItem={renderBreadcrumbItem}
        />
        <SidebarDriveScopeSwitcher />
      </>
    ),
    [breadcrumbItems, handleEnterFolder, renderBreadcrumbItem]
  );

  const renderNameContent = useCallback(
    (content: ReactNode, row: DriveTableRow) => (
      <DriveDndNameContent
        row={row}
        draggableDisabled={movingByDrag || !isDriveDragSource(row)}
        droppableDisabled={movingByDrag || draggingRowKeys.size === 0 || !isDriveMoveTarget(row)}
      >
        {content}
      </DriveDndNameContent>
    ),
    [draggingRowKeys.size, movingByDrag]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <main className={styles.listArea}>
        <div className={styles.driveFrame}>
          <div className={styles.driveBody}>
            <div className={styles.tablePanel} onDoubleClick={handleDoubleClick}>
              <FolderTable<DriveTableRow>
                ariaLabel="云盘文件列表"
                items={rows}
                columns={DRIVE_TABLE_COLUMNS}
                loading={loading}
                breadcrumb={breadcrumb}
                toolbar={toolbar}
                expandedRowKeys={expandedRowKeys}
                onExpandedChange={handleExpandedChange}
                selectedRowKeys={selectedRowKeys}
                onRowSelect={handleRowSelect}
                onRowActivate={handleRowActivate}
                renderNameContent={renderNameContent}
                totalCount={currentDirectoryItemCount}
                summary={`当前目录共 ${currentDirectoryItemCount} 项`}
                className={styles.table}
                sortDescriptor={sortDescriptor}
                onSortChange={handleSortChange}
                isPinnedFirst={isDrivePinnedFirstRow}
                rowActions={resolveRowActions}
                batchSelection={batchSelection}
                batchFooter={batchFooter}
              />
            </div>

            <div className={styles.detailPanel}>
              <TableDriveSelectionPanel
                selectedRow={selectedRowKeys.size > 1 ? undefined : selectedNode}
                selectedCount={selectedRowKeys.size}
                groupId={finalGroupId}
                isTrashView={isTrashView}
                canManageTagPermission={showManagePermission && !isTrashView}
                tagPermissionRefreshToken={tagPermissionRefreshToken}
                resourcePermissionRefreshToken={resourcePermissionRefreshToken}
                onEnter={handleEnterFolder}
                onOpen={handleClickNode}
                onRename={handleOpenRename}
                onMove={handleOpenMove}
                onDelete={handleOpenDelete}
                onManageTagAccessPermission={openTagAccessPermission}
                onManageTagMountPermission={openTagMountPermission}
                onManageResourcePermission={openResourcePermission}
                onTagPermissionChange={refreshDrive}
              />
            </div>
          </div>
        </div>
        {ModalHost}
        <RenameNodeModal
          isOpen={Boolean(renameTarget)}
          node={renameTarget}
          groupId={finalGroupId}
          onOpenChange={(open) => {
            if (!open) setRenameTarget(null);
          }}
          onSuccess={refreshDrive}
        />
        <MoveNodeModal
          isOpen={Boolean(moveTarget)}
          node={moveTarget}
          rootId={finalRootId}
          groupId={finalGroupId}
          isTrashView={isTrashView}
          onOpenChange={(open) => {
            if (!open) setMoveTarget(null);
          }}
          onSuccess={handleNodeActionSuccess}
        />
        {isTrashView ? (
          <TrashDelete
            isOpen={Boolean(deleteTarget)}
            node={deleteTarget}
            onOpenChange={handleDeleteModalOpenChange}
            onSuccess={handleNodeActionSuccess}
          />
        ) : (
          <DriveDelete
            isOpen={Boolean(deleteTarget)}
            node={deleteTarget}
            groupId={finalGroupId}
            onOpenChange={handleDeleteModalOpenChange}
            onSuccess={handleNodeActionSuccess}
          />
        )}
      </main>
      <DragOverlay>
        {activeDragRow && draggingRowKeys.size > 0 ? (
          <DriveDragOverlay row={activeDragRow} count={draggingRowKeys.size} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});

export default TableDrive;
