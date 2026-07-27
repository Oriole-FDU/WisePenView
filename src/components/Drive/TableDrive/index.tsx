import AppIconButton from '@/components/Button/AppIconButton';
import {
  DriveDeleteModal,
  MoveNodeModal,
  RenameNodeModal,
  TrashDeleteModal,
} from '@/components/Drive/Modals';
import { FolderTable, type FolderTableBreadcrumbItem } from '@/components/Table';
import { useDriveService } from '@/domains';
import type { DriveNode } from '@/domains/Drive';
import { parseErrorMessage } from '@/utils/error';
import type { ResourceViewer } from '@/utils/navigation/resourceTarget';
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { Button, toast, type SortDescriptor } from '@heroui/react';
import { useRequest } from 'ahooks';
import { PanelRightClose, PanelRightOpen, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import type { DriveTableRow, TableDriveProps } from './index.type';
import CreateMenu from './parts/CreateMenu';
import DriveDetailPanel from './parts/DriveDetailPanel';
import { DriveDragOverlay } from './parts/DriveDnd';
import styles from './style.module.less';
import { buildDriveTableColumns } from './tableColumns';
import { buildDriveTableRowMap, isDrivePinnedFirstRow, toDriveTableRow } from './tableRows';
import { useTableDrive } from './useTableDrive';
import { useTableDriveActions } from './useTableDriveActions';
import { useTableDriveDnd } from './useTableDriveDnd';
import { useTableDriveRowActions } from './useTableDriveRowActions';

function toBreadcrumbItems(pathNodes: DriveNode[]): FolderTableBreadcrumbItem[] {
  return pathNodes
    .filter((node) => node.type !== 'loading')
    .map((node, index) => ({
      id: node.id,
      label: getDriveNodeLabel(node),
      isRoot: index === 0,
    }));
}

function TableDrive({
  groupId,
  rootId,
  initialNodeId,
  onCurrentNodeChange,
  scope,
  breadcrumbExtra,
  actions,
}: TableDriveProps) {
  const { t } = useTranslation(['drive', 'resource', 'common']);
  const driveService = useDriveService();
  const resolvedScope = resolveDriveScope(scope, groupId, rootId);
  const finalRootId = resolvedScope.rootId;
  const finalGroupId = resolvedScope.groupId;
  const canOpenTrash = !finalGroupId;

  const {
    currentNodeId,
    dataSource,
    pathNodes,
    loading,
    expandedRowKeys,
    enterFolder,
    handleExpandedChange,
    refresh,
  } = useTableDrive({
    initialNodeId,
    scope: resolvedScope.scope,
  });
  const [checkedRowKeys, setCheckedRowKeys] = useState<Set<string>>(new Set());
  const [selectedRowId, setSelectedRowId] = useState<string>();
  const [isDetailPanelCollapsed, setIsDetailPanelCollapsed] = useState(false);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor | undefined>();
  const lastSortClickRef = useRef<{ column: string; time: number } | null>(null);

  const handleSortChange = (descriptor: SortDescriptor) => {
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
  };
  const [renameTarget, setRenameTarget] = useState<DriveActionTarget | null>(null);
  const [moveNodes, setMoveNodes] = useState<DriveActionTarget[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DriveActionTarget | null>(null);
  const beforeTrashNodeIdRef = useRef<string | null>(null);

  const handleClearSelection = () => {
    setCheckedRowKeys(new Set());
  };

  const handleNodeActionSuccess = () => {
    handleClearSelection();
    refresh();
  };

  const rows = dataSource.map((node) => toDriveTableRow(node, t));
  const rowMap = buildDriveTableRowMap(rows);
  const columns = buildDriveTableColumns(t);
  const {
    sensors,
    draggingCount,
    activeDragRow,
    clearDragState,
    handleDragStart,
    handleDragEnd,
    renderBreadcrumbItem,
    renderNameContent,
  } = useTableDriveDnd({
    rowMap,
    pathNodes,
    checkedRowKeys,
    groupId: finalGroupId,
    onMoveSuccess: handleNodeActionSuccess,
  });

  const handleEnterFolder = (nodeId: string) => {
    setCheckedRowKeys(new Set());
    setSelectedRowId(undefined);
    clearDragState();
    onCurrentNodeChange?.(nodeId);
    enterFolder(nodeId);
  };
  const handleClickNode = useClickNode({
    enterFolder: handleEnterFolder,
  });
  const selectedRow = selectedRowId ? rowMap.get(selectedRowId) : undefined;
  const selectedActionTargets = (() => {
    const targets: DriveActionTarget[] = [];
    checkedRowKeys.forEach((rowId) => {
      const node = rowMap.get(rowId)?.node;
      if (node && isDriveActionTarget(node) && !isDriveSystemFolderNode(node)) {
        targets.push(node);
      }
    });
    return targets;
  })();
  const canBatchMove =
    checkedRowKeys.size > 0 && selectedActionTargets.length === checkedRowKeys.size;
  const sharedRowKeys = new Set(
    [...rowMap.values()].filter((row) => isDriveSharedFolderNode(row.node)).map((row) => row.id)
  );

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
        toast.success(t('table.batchDeleted', { count: checkedRowKeys.size }));
        handleNodeActionSuccess();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const checkboxSelection = {
    selectedKeys: checkedRowKeys,
    onSelectionChange: (keys: Set<string>) => {
      setCheckedRowKeys(keys);
      if (keys.size > 0) {
        setSelectedRowId(undefined);
      }
    },
    hiddenKeys: sharedRowKeys,
  };

  const currentDirectoryItemCount = rows.filter((row) => row.entryType !== 'loading').length;

  const handleDeleteModalOpenChange = (open: boolean) => {
    if (!open) setDeleteTarget(null);
  };

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
  const isEditMode = checkedRowKeys.size > 0;
  const selectionFooter = (() => {
    if (!isEditMode) return null;
    return (
      <div className={styles.selectionActions}>
        {canBatchMove ? (
          <Button variant="secondary" size="sm" onPress={() => setMoveNodes(selectedActionTargets)}>
            {t('table.move')}
          </Button>
        ) : null}
        {!isTrashView ? (
          <Button
            variant="danger"
            size="sm"
            isDisabled={batchDeleting}
            onPress={() => runBatchDelete()}
          >
            {t('actions.delete', { ns: 'common' })}
          </Button>
        ) : null}
        <Button variant="secondary" size="sm" onPress={handleClearSelection}>
          {t('table.clearSelection')}
        </Button>
      </div>
    );
  })();
  const openTrash = async () => {
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
        toast.danger(t('table.trashNotFound'));
        return;
      }
      beforeTrashNodeIdRef.current = currentNodeId;
      handleEnterFolder(resolvedTrashFolderNodeId);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };

  const mountTagId = resolveCurrentFolderTagId(currentNodeId, pathNodes);
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
    refresh,
    mountTagId,
    isTrashView,
  });
  const toolbar = (
    <div className={styles.toolbarActions}>
      {!isEditMode && showCreateMenu ? (
        <CreateMenu items={createMenuItems} onSelect={handleCreateMenuSelect} />
      ) : null}
      {!isEditMode && showUploadToGroup ? (
        <Button variant="secondary" size="sm" onPress={openUploadToGroup}>
          {t('table.addFromPersonal')}
        </Button>
      ) : null}
      {!isEditMode && canOpenTrash ? (
        <Button variant={isTrashView ? 'primary' : 'secondary'} size="sm" onPress={openTrash}>
          <Trash2 size={16} aria-hidden="true" />
          {isTrashView ? t('page.backToDrive') : t('node.trash')}
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
        label={isDetailPanelCollapsed ? t('table.expandDetails') : t('table.collapseDetails')}
        size="sm"
        className={styles.detailPanelToggle}
        onPress={() => setIsDetailPanelCollapsed((collapsed) => !collapsed)}
      />
    </div>
  );

  const handleRowActivate = (row: DriveTableRow, viewer?: ResourceViewer) => {
    handleClickNode(row.node, viewer);
  };

  const handleRowSelect = (row: DriveTableRow) => {
    if (row.node.type !== 'loading') {
      setSelectedRowId(row.id);
    }
  };

  const resolveRowActions = useTableDriveRowActions({
    groupId: finalGroupId,
    isEditMode,
    isTrashView,
    showManagePermission,
    onEnterFolder: handleEnterFolder,
    onOpenNode: handleClickNode,
    onRename: setRenameTarget,
    onMoveNodes: setMoveNodes,
    onDelete: setDeleteTarget,
    onOpenTagAccessPermission: openTagAccessPermission,
    onOpenTagMountPermission: openTagMountPermission,
    onOpenResourcePermission: openResourcePermission,
  });

  const breadcrumb = (() => {
    const items = toBreadcrumbItems(pathNodes);
    return (
      <>
        <FolderTable.Breadcrumb
          items={items}
          onJump={handleEnterFolder}
          renderItem={renderBreadcrumbItem}
        />
        {breadcrumbExtra}
      </>
    );
  })();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={clearDragState}
    >
      <main className={styles.listArea}>
        <div className={styles.driveFrame}>
          <div className={styles.driveBody}>
            <div className={styles.tablePanel}>
              <FolderTable<DriveTableRow>
                ariaLabel={t('table.aria')}
                items={rows}
                columns={columns}
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
                summary={t('table.summary', { count: currentDirectoryItemCount })}
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
              aria-label={t('table.detailsAsideAria')}
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
                  onRename={setRenameTarget}
                  onMoveNodes={setMoveNodes}
                  onDelete={setDeleteTarget}
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
          onSuccess={refresh}
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
          <TrashDeleteModal
            isOpen={Boolean(deleteTarget)}
            node={deleteTarget}
            onOpenChange={handleDeleteModalOpenChange}
            onSuccess={handleNodeActionSuccess}
          />
        ) : (
          <DriveDeleteModal
            isOpen={Boolean(deleteTarget)}
            node={deleteTarget}
            groupId={finalGroupId}
            onOpenChange={handleDeleteModalOpenChange}
            onSuccess={handleNodeActionSuccess}
          />
        )}
      </main>
      <DragOverlay>
        {activeDragRow && draggingCount > 0 ? (
          <DriveDragOverlay row={activeDragRow} count={draggingCount} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default TableDrive;
