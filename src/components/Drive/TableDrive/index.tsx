import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/_shadcn';
import AppIconButton from '@/components/Button/AppIconButton';
import {
  DriveDelete,
  MoveNodeModal,
  RenameNodeModal,
  TrashDelete,
  type ResourcePermissionModalTarget,
} from '@/components/Drive/Modals';
import EntryIcon from '@/components/Icons/EntryIcon';
import {
  FolderTable,
  type FolderTableBreadcrumbItem,
  type FolderTableColumn,
  type FolderTableRowAction,
} from '@/components/Table';
import { useDriveService } from '@/domains';
import type { DriveNode } from '@/domains/Drive';
import SidebarDriveScopeSwitcher from '@/layouts/_common/Sidebar/DriveSidebar/_components/SidebarDrive/SidebarDriveScopeSwitcher';
import { parseErrorMessage } from '@/utils/error';
import { formatFileSize } from '@/utils/format/formatFileSize';
import {
  RESOURCE_KIND,
  RESOURCE_VIEWER,
  resolveResourceKind,
  resolveResourceViewer,
  type ResourceViewer,
} from '@/utils/navigation/resourceTarget';
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
import { Button, ToggleButton, ToggleButtonGroup, toast, type SortDescriptor } from '@heroui/react';
import { useMount, useRequest, useUpdateEffect } from 'ahooks';
import {
  FolderInput,
  FolderOpen,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
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
  return isDriveActionTarget(row.node) && !isDriveSharedFolderNode(row.node);
}

function isDriveMoveTarget(row: DriveTableRow): boolean {
  return isDriveMoveTargetNode(row.node);
}

function isDriveMoveTargetNode(node: DriveNode): boolean {
  return (node.type === 'folder' || node.type === 'root') && !isDriveSharedFolderNode(node);
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

interface DriveDetailPanelProps {
  selectedRow?: DriveTableRow;
  isEditMode: boolean;
  selectedCount: number;
  groupId?: string;
  isTrashView: boolean;
  showManagePermission: boolean;
  onActivate: (row: DriveTableRow, viewer?: ResourceViewer) => void;
  onRename: (node: DriveActionTarget) => void;
  onMove: (node: DriveActionTarget) => void;
  onDelete: (node: DriveActionTarget) => void;
  onOpenTagAccessPermission: (tagId: string) => void;
  onOpenTagMountPermission: (tagId: string) => void;
  onOpenResourcePermission: (target: ResourcePermissionModalTarget) => void;
}

function DriveDetailPanel({
  selectedRow,
  isEditMode,
  selectedCount,
  groupId,
  isTrashView,
  showManagePermission,
  onActivate,
  onRename,
  onMove,
  onDelete,
  onOpenTagAccessPermission,
  onOpenTagMountPermission,
  onOpenResourcePermission,
}: DriveDetailPanelProps) {
  const [selectedViewer, setSelectedViewer] = useState<ResourceViewer>(() => {
    if (selectedRow && (selectedRow.node.type === 'resource' || selectedRow.node.type === 'link')) {
      return (
        resolveResourceViewer({ resourceType: selectedRow.node.resourceType }) ??
        RESOURCE_VIEWER.PDF_PREVIEW
      );
    }
    return RESOURCE_VIEWER.PDF_PREVIEW;
  });

  if (isEditMode) {
    return (
      <div className={styles.detailContent}>
        <div className={styles.detailHeader}>
          <span className={styles.detailTitle}>编辑模式</span>
        </div>
        <div className={styles.detailBody}>
          <p className={styles.detailHint}>已选中 {selectedCount} 项，可在表格底部执行批量操作。</p>
        </div>
      </div>
    );
  }

  if (!selectedRow || selectedRow.node.type === 'loading') {
    return (
      <div className={styles.detailContent}>
        <div className={styles.detailHeader}>
          <span className={styles.detailTitle}>详情</span>
        </div>
        <div className={styles.detailEmpty}>单击文件或文件夹以查看详情</div>
      </div>
    );
  }

  const actionTarget = toDriveActionTarget(selectedRow.node);
  const modifiableActionTarget =
    actionTarget && !isDriveSystemFolderNode(actionTarget) ? actionTarget : undefined;
  const activateLabel =
    selectedRow.node.type === 'root' || selectedRow.node.type === 'folder' ? '进入' : '打开';
  const deleteLabel = groupId
    ? '移除'
    : isTrashView
      ? '永久删除'
      : selectedRow.node.type === 'link'
        ? '删除链接'
        : '移入回收站';
  const resourceKind =
    selectedRow.node.type === 'resource' || selectedRow.node.type === 'link'
      ? resolveResourceKind(selectedRow.node.resourceType)
      : undefined;
  const isFileResource = resourceKind === RESOURCE_KIND.FILE;
  const permissionTarget =
    showManagePermission &&
    !isTrashView &&
    (actionTarget?.type === 'folder' || actionTarget?.type === 'resource')
      ? actionTarget
      : undefined;

  return (
    <div className={styles.detailContent}>
      <div className={styles.detailHeader}>
        <span className={styles.detailIcon} aria-hidden="true">
          <EntryIcon
            entryType={selectedRow.entryType}
            folderIconType={selectedRow.folderIconType}
            resourceType={selectedRow.resourceType}
            resourceIconType={selectedRow.resourceIconType}
          />
        </span>
        <div className={styles.detailTitleBlock}>
          <span className={styles.detailTitle}>{selectedRow.name}</span>
          <span className={styles.detailType}>{selectedRow.typeLabel}</span>
        </div>
      </div>
      <div className={styles.detailBody}>
        <Accordion multiple defaultValue={['details']} className={styles.detailAccordion}>
          <AccordionItem value="details" className={styles.detailSection}>
            <AccordionTrigger className={styles.detailSectionTrigger}>详情</AccordionTrigger>
            <AccordionContent className={styles.detailSectionContent}>
              <dl className={styles.detailMeta}>
                <div>
                  <dt>节点 ID</dt>
                  <dd>{selectedRow.node.id}</dd>
                </div>
                <div>
                  <dt>大小</dt>
                  <dd>{selectedRow.sizeLabel ?? '—'}</dd>
                </div>
              </dl>
            </AccordionContent>
          </AccordionItem>

          {permissionTarget ? (
            <AccordionItem value="permission" className={styles.detailSection}>
              <AccordionTrigger className={styles.detailSectionTrigger}>权限</AccordionTrigger>
              <AccordionContent className={styles.detailSectionContent}>
                {permissionTarget.type === 'folder' ? (
                  <div className={styles.detailSectionActions}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => onOpenTagAccessPermission(permissionTarget.tagId)}
                    >
                      <ShieldCheck size={16} aria-hidden="true" />
                      访问权限
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => onOpenTagMountPermission(permissionTarget.tagId)}
                    >
                      <FolderInput size={16} aria-hidden="true" />
                      挂载权限
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className={styles.detailSectionButton}
                    onPress={() =>
                      onOpenResourcePermission({
                        resourceId: permissionTarget.resourceId,
                        resourceType: resolveResourceKind(permissionTarget.resourceType),
                        resourceName: selectedRow.name,
                        fallbackTagId: permissionTarget.folderTagId,
                      })
                    }
                  >
                    <ShieldCheck size={16} aria-hidden="true" />
                    资源权限
                  </Button>
                )}
              </AccordionContent>
            </AccordionItem>
          ) : null}

          {modifiableActionTarget ? (
            <AccordionItem value="operations" className={styles.detailSection}>
              <AccordionTrigger className={styles.detailSectionTrigger}>操作</AccordionTrigger>
              <AccordionContent className={styles.detailSectionContent}>
                <div className={styles.detailSectionActions}>
                  {modifiableActionTarget.type !== 'link' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => onRename(modifiableActionTarget)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                      重命名
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => onMove(modifiableActionTarget)}
                  >
                    <FolderInput size={16} aria-hidden="true" />
                    {isTrashView ? '移动到云盘' : '移动'}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ) : null}

          {isFileResource ? (
            <AccordionItem value="open-with" className={styles.detailSection}>
              <AccordionTrigger className={styles.detailSectionTrigger}>打开方式</AccordionTrigger>
              <AccordionContent className={styles.detailSectionContent}>
                <ToggleButtonGroup
                  aria-label="打开方式"
                  selectionMode="single"
                  selectedKeys={new Set([selectedViewer])}
                  onSelectionChange={(keys) => {
                    const [key] = [...keys];
                    if (key != null) setSelectedViewer(String(key) as ResourceViewer);
                  }}
                  orientation="horizontal"
                  size="sm"
                  fullWidth
                  disallowEmptySelection
                  className={styles.openWithOptions}
                >
                  <ToggleButton id={RESOURCE_VIEWER.PDF_PREVIEW}>PDF 预览</ToggleButton>
                  <ToggleButton id={RESOURCE_VIEWER.OFFICE}>Office</ToggleButton>
                </ToggleButtonGroup>
              </AccordionContent>
            </AccordionItem>
          ) : null}
        </Accordion>
      </div>
      <div className={styles.detailActions}>
        <Button
          variant="primary"
          size="sm"
          onPress={() => onActivate(selectedRow, isFileResource ? selectedViewer : undefined)}
        >
          <FolderOpen size={16} aria-hidden="true" />
          {activateLabel}
        </Button>
        {modifiableActionTarget ? (
          <Button variant="danger" size="sm" onPress={() => onDelete(modifiableActionTarget)}>
            <Trash2 size={16} aria-hidden="true" />
            {deleteLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

const TableDrive = forwardRef<TableDriveHandle, TableDriveProps>(function TableDrive(
  {
    groupId,
    rootId,
    initialNodeId,
    onCurrentNodeChange,
    scope,
    actions,
    onTrashViewChange,
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
  const [checkedRowKeys, setCheckedRowKeys] = useState<Set<string>>(new Set());
  const [selectedRowId, setSelectedRowId] = useState<string>();
  const [isDetailPanelCollapsed, setIsDetailPanelCollapsed] = useState(false);
  const [draggingRowKeys, setDraggingRowKeys] = useState<Set<string>>(new Set());
  const [activeDragRowId, setActiveDragRowId] = useState<string | null>(null);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor | undefined>();
  const lastSortClickRef = useRef<{ column: string; time: number } | null>(null);

  const handleSortChange = useCallback((descriptor: SortDescriptor) => {
    const now = Date.now();
    const last = lastSortClickRef.current;
    const column = String(descriptor.column);

    if (last && last.column === column && now - last.time < 300) {
      // 双击同一列 → 回到默认未排序状态
      lastSortClickRef.current = null;
      setSortDescriptor(undefined);
      return;
    }

    lastSortClickRef.current = { column, time: now };
    setSortDescriptor(descriptor);
  }, []);
  const [renameTarget, setRenameTarget] = useState<DriveActionTarget | null>(null);
  const [moveNodes, setMoveNodes] = useState<DriveActionTarget[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DriveActionTarget | null>(null);
  const beforeTrashNodeIdRef = useRef<string | null>(null);
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
    setCheckedRowKeys(new Set());
  }, []);

  const refreshDrive = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleEnterFolder = useCallback(
    (nodeId: string) => {
      setCheckedRowKeys(new Set());
      setSelectedRowId(undefined);
      updateDraggingRowKeys(new Set());
      setActiveDragRowId(null);
      onCurrentNodeChange?.(nodeId);
      enterFolder(nodeId);
    },
    [enterFolder, onCurrentNodeChange, updateDraggingRowKeys]
  );
  const handleClickNode = useClickNode({
    enterFolder: handleEnterFolder,
  });
  const rows = useMemo(() => dataSource.map((node) => toDriveTableRow(node)), [dataSource]);
  const rowMap = useMemo(() => buildDriveTableRowMap(rows), [rows]);
  const selectedRow = selectedRowId ? rowMap.get(selectedRowId) : undefined;
  const selectedActionTargets = useMemo(() => {
    const targets: DriveActionTarget[] = [];
    checkedRowKeys.forEach((rowId) => {
      const node = rowMap.get(rowId)?.node;
      if (node && isDriveActionTarget(node) && !isDriveSystemFolderNode(node)) {
        targets.push(node);
      }
    });
    return targets;
  }, [checkedRowKeys, rowMap]);
  const canBatchMove =
    checkedRowKeys.size > 0 && selectedActionTargets.length === checkedRowKeys.size;
  const sharedRowKeys = useMemo(
    () =>
      new Set(
        [...rowMap.values()].filter((row) => isDriveSharedFolderNode(row.node)).map((row) => row.id)
      ),
    [rowMap]
  );
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

  const { loading: batchDeleting, run: runBatchDelete } = useRequest(
    async () => {
      const ids = [...checkedRowKeys];
      await Promise.all(
        ids.map((nodeId) => driveService.removeNode({ nodeId, groupId: finalGroupId }))
      );
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(`已删除 ${checkedRowKeys.size} 项`);
        setCheckedRowKeys(new Set());
        refreshDrive();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const checkboxSelection = useMemo(
    () => ({
      selectedKeys: checkedRowKeys,
      onSelectionChange: (keys: Set<string>) => {
        setCheckedRowKeys(keys);
        if (keys.size > 0) {
          setSelectedRowId(undefined);
        }
      },
      hiddenKeys: sharedRowKeys,
    }),
    [checkedRowKeys, sharedRowKeys]
  );

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
    setMoveNodes([node]);
  }, []);

  const handleOpenBatchMove = useCallback(() => {
    if (!canBatchMove) return;
    setMoveNodes(selectedActionTargets);
  }, [canBatchMove, selectedActionTargets]);

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
  const selectionFooter = useMemo(() => {
    if (checkedRowKeys.size === 0) return null;
    return (
      <div className={styles.selectionActions}>
        {canBatchMove ? (
          <Button variant="secondary" size="sm" onPress={handleOpenBatchMove}>
            移动
          </Button>
        ) : null}
        {!isTrashView ? (
          <Button
            variant="danger"
            size="sm"
            isDisabled={batchDeleting}
            onPress={() => runBatchDelete()}
          >
            删除
          </Button>
        ) : null}
        <Button variant="secondary" size="sm" onPress={handleClearSelection}>
          清除选择
        </Button>
      </div>
    );
  }, [
    batchDeleting,
    canBatchMove,
    checkedRowKeys.size,
    handleClearSelection,
    handleOpenBatchMove,
    isTrashView,
    runBatchDelete,
  ]);
  const isEditMode = checkedRowKeys.size > 0;
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
    ModalHost,
  } = useTableDriveActions({
    currentNodeId,
    currentRows: rows,
    scope: resolvedScope.scope,
    actions,
    refresh: refreshDrive,
    targetTagId,
    isTrashView,
  });
  const toolbar = useMemo(
    () => (
      <div className={styles.toolbarActions}>
        {!isEditMode && showCreateMenu ? (
          <CreateMenu items={createMenuItems} onSelect={handleCreateMenuSelect} />
        ) : null}
        {!isEditMode && showUploadToGroup ? (
          <Button variant="secondary" size="sm" onPress={openUploadToGroup}>
            从个人云盘添加
          </Button>
        ) : null}
        {!isEditMode && showToolbarTrash && canOpenTrash ? (
          <Button variant={isTrashView ? 'primary' : 'secondary'} size="sm" onPress={openTrash}>
            <Trash2 size={16} aria-hidden="true" />
            {isTrashView ? '返回云盘' : '回收站'}
          </Button>
        ) : null}
        <AppIconButton
          icon={
            isDetailPanelCollapsed ? (
              <PanelRightOpen size={16} aria-hidden="true" />
            ) : (
              <PanelRightClose size={16} aria-hidden="true" />
            )
          }
          label={isDetailPanelCollapsed ? '展开详情侧栏' : '收起详情侧栏'}
          size="sm"
          className={styles.detailPanelToggle}
          onPress={() => setIsDetailPanelCollapsed((collapsed) => !collapsed)}
        />
      </div>
    ),
    [
      batchMode,
      createMenuItems,
      handleCreateMenuSelect,
      isEditMode,
      isDetailPanelCollapsed,
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
    (row: DriveTableRow, viewer?: ResourceViewer) => {
      handleClickNode(row.node, viewer);
    },
    [handleClickNode]
  );

  const handleRowSelect = useCallback((row: DriveTableRow) => {
    if (row.node.type !== 'loading') {
      setSelectedRowId(row.id);
    }
  }, []);

  const resolveRowActions = useCallback(
    (row: DriveTableRow): FolderTableRowAction<DriveTableRow>[] => {
      if (isEditMode) return [];
      const actionTarget = toDriveActionTarget(row.node);
      if (!actionTarget) return [];
      if (actionTarget.type === 'folder' && actionTarget.systemType === 'shared') return [];

      const openAction: FolderTableRowAction<DriveTableRow> =
        actionTarget.type === 'folder'
          ? {
              key: 'enter',
              label: '进入',
              onPress: () => handleEnterFolder(actionTarget.id),
            }
          : {
              key: 'open',
              label: '打开',
              onPress: () => handleClickNode(row.node),
            };

      const actions: FolderTableRowAction<DriveTableRow>[] = [openAction];

      if (showManagePermission && !isTrashView) {
        if (actionTarget.type === 'folder') {
          actions.push(
            {
              key: 'tag-access-permission',
              label: '访问权限',
              onPress: () => openTagAccessPermission(actionTarget.tagId),
            },
            {
              key: 'tag-mount-permission',
              label: '挂载权限',
              onPress: () => openTagMountPermission(actionTarget.tagId),
            }
          );
        } else if (actionTarget.type === 'resource') {
          actions.push({
            key: 'resource-permission',
            label: '资源权限',
            onPress: () =>
              openResourcePermission({
                resourceId: actionTarget.resourceId,
                resourceType: resolveResourceKind(actionTarget.resourceType),
                resourceName: row.name,
                fallbackTagId: actionTarget.folderTagId,
              }),
          });
        }
      }

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
      isEditMode,
      openResourcePermission,
      openTagAccessPermission,
      openTagMountPermission,
      showManagePermission,
    ]
  );

  const resolveDragSourceIds = useCallback(
    (row: DriveTableRow): string[] => {
      if (!isDriveDragSource(row)) {
        return [];
      }
      const sourceIds = checkedRowKeys.has(row.id) ? [...checkedRowKeys] : [row.id];
      return sourceIds.filter((rowId) => {
        const sourceRow = rowMap.get(rowId);
        return sourceRow ? isDriveDragSource(sourceRow) : false;
      });
    },
    [checkedRowKeys, rowMap]
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
    },
    [movingByDrag, resolveDragSourceIds, rowMap, updateDraggingRowKeys]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const targetNodeId = event.over?.data.current?.targetNodeId;
      const sourceRowIds = [...draggingRowKeysRef.current];
      const targetNode =
        typeof targetNodeId === 'string' ? driveNodeMap.get(targetNodeId) : undefined;

      if (
        targetNode &&
        isDriveMoveTargetNode(targetNode) &&
        sourceRowIds.length > 0 &&
        !sourceRowIds.includes(targetNode.id)
      ) {
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
          disabled={
            movingByDrag || draggingRowKeys.size === 0 || !isDriveMoveTargetNode(targetNode)
          }
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
                selectedRowKey={selectedRow?.id}
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
                isEditMode={isEditMode}
                checkboxSelection={checkboxSelection}
                selectionFooter={selectionFooter}
              />
            </div>
            <aside
              className={styles.detailPanel}
              data-collapsed={isDetailPanelCollapsed ? 'true' : undefined}
              aria-label="节点详情侧栏"
            >
              {!isDetailPanelCollapsed ? (
                <DriveDetailPanel
                  key={selectedRow?.id ?? (isEditMode ? 'edit-mode' : 'empty')}
                  selectedRow={selectedRow}
                  isEditMode={isEditMode}
                  selectedCount={checkedRowKeys.size}
                  groupId={finalGroupId}
                  isTrashView={isTrashView}
                  showManagePermission={showManagePermission}
                  onActivate={handleRowActivate}
                  onRename={handleOpenRename}
                  onMove={handleOpenMove}
                  onDelete={handleOpenDelete}
                  onOpenTagAccessPermission={openTagAccessPermission}
                  onOpenTagMountPermission={openTagMountPermission}
                  onOpenResourcePermission={openResourcePermission}
                />
              ) : null}
            </aside>
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
          isOpen={moveNodes.length > 0}
          nodes={moveNodes}
          rootId={finalRootId}
          groupId={finalGroupId}
          isTrashView={isTrashView}
          onOpenChange={(open) => {
            if (!open) setMoveNodes([]);
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
