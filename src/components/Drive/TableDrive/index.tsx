import AppIconButton from '@/components/Button/AppIconButton';
import { FolderTable, type FolderTableBreadcrumbItem } from '@/components/Table';
import type { DriveNode } from '@/domains/Drive';
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { Button } from '@heroui/react';
import { PanelRightClose, PanelRightOpen, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getDriveNodeLabel,
  resolveCurrentFolderTagId,
  resolveDriveScope,
} from '../common/driveComponentModel';
import { useClickNode } from '../common/useClickNode';
import {
  useTableDriveActionsController,
  useTableDriveDndController,
  useTableDriveExternalDndController,
  useTableDriveInteractionController,
  useTableDriveNavigationController,
  useTableDriveRowActionsController,
  useTableDriveTrashController,
} from './controllers';
import type { DriveTableRow, TableDriveProps } from './index.type';
import CreateMenu from './parts/CreateMenu';
import DriveDetailPanel from './parts/DriveDetailPanel';
import { DriveDragOverlay, ExternalFileDroppableBreadcrumb } from './parts/DriveDnd';
import styles from './style.module.less';
import { buildDriveTableColumns, isDrivePinnedFirstRow } from './tableConfig';

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

  // 解析作用域，派生 groupId / rootId / scope
  const resolvedScope = resolveDriveScope(scope, groupId, rootId);

  // 初始化导航控制器
  const navigation = useTableDriveNavigationController({
    initialNodeId,
    scope: resolvedScope.scope,
  });

  // 初始化交互控制器
  const interaction = useTableDriveInteractionController({ dataSource: navigation.dataSource, t });

  // 封装一个通用的节点操作成功回调，清理选中状态并刷新列表
  const handleNodeActionSuccess = () => {
    interaction.clearChecked();
    navigation.refresh();
  };

  // 初始化拖拽控制器
  const dnd = useTableDriveDndController({
    rowMap: interaction.rowMap,
    pathNodes: navigation.pathNodes,
    checkedRowKeys: interaction.checkedRowKeys,
    groupId: resolvedScope.groupId,
    onMoveSuccess: handleNodeActionSuccess,
  });

  // 封装一个通用的进入目录回调，清理选中状态并刷新列表
  const handleEnterFolder = (nodeId: string) => {
    interaction.clearChecked();
    interaction.clearSelectedRow();
    dnd.clearDragState();
    onCurrentNodeChange?.(nodeId);
    navigation.enterFolder(nodeId);
  };

  // 封装一个通用的点击节点回调，清理选中状态并刷新列表
  const handleClickNode = useClickNode({ enterFolder: handleEnterFolder });

  // 初始化回收站控制器
  const trash = useTableDriveTrashController({
    currentNodeId: navigation.currentNodeId,
    pathNodes: navigation.pathNodes,
    rootId: resolvedScope.rootId,
    scope: resolvedScope.scope,
    onEnterFolder: handleEnterFolder,
    t,
  });

  const mountTagId = resolveCurrentFolderTagId(navigation.currentNodeId, navigation.pathNodes);
  const externalDnd = useTableDriveExternalDndController({
    pathTagId: mountTagId,
    isTrashView: trash.isTrashView,
    rowMap: interaction.rowMap,
    pathNodes: navigation.pathNodes,
    onUploadSuccess: navigation.refresh,
  });

  const actionsController = useTableDriveActionsController({
    currentNodeId: navigation.currentNodeId,
    currentRows: interaction.rows,
    checkedRowKeys: interaction.checkedRowKeys,
    scope: resolvedScope.scope,
    actions,
    refresh: navigation.refresh,
    mountTagId,
    isTrashView: trash.isTrashView,
    onNodeActionSuccess: handleNodeActionSuccess,
  });

  const columns = buildDriveTableColumns(t);
  const isEditMode = interaction.checkedRowKeys.size > 0;
  const checkboxSelection = {
    selectedKeys: interaction.checkedRowKeys,
    onSelectionChange: (keys: Set<string>) => {
      interaction.setCheckedRowKeys(keys);
      if (keys.size > 0) {
        interaction.clearSelectedRow();
      }
    },
    hiddenKeys: interaction.sharedRowKeys,
  };

  const handleRowSelect = (row: DriveTableRow) => {
    if (row.node.type !== 'loading') {
      interaction.setSelectedRowId(row.id);
    }
  };

  const resolveRowActions = useTableDriveRowActionsController({
    groupId: resolvedScope.groupId,
    isEditMode,
    isTrashView: trash.isTrashView,
    showManagePermission: actionsController.showManagePermission,
    onEnterFolder: handleEnterFolder,
    onOpenNode: handleClickNode,
    onRename: actionsController.setRenameTarget,
    onMoveNodes: actionsController.setMoveNodes,
    onDelete: actionsController.setDeleteTarget,
    onOpenTagAccessPermission: actionsController.openTagAccessPermission,
    onOpenTagMountPermission: actionsController.openTagMountPermission,
    onOpenResourcePermission: actionsController.openResourcePermission,
  });

  const renderNameContent = (content: ReactNode, row: DriveTableRow) => (
    <span
      className={styles.externalFileDropTarget}
      data-drop-target={externalDnd.activeDropRowId === row.id ? 'true' : undefined}
    >
      {dnd.renderNameContent(content, row)}
    </span>
  );

  const breadcrumb = (() => {
    const items = toBreadcrumbItems(navigation.pathNodes);
    return (
      <>
        <FolderTable.Breadcrumb
          items={items}
          onJump={handleEnterFolder}
          renderItem={(content, item) => (
            <ExternalFileDroppableBreadcrumb
              nodeId={item.id}
              isActive={externalDnd.activeBreadcrumbNodeId === item.id}
              handlers={externalDnd.breadcrumbDragHandlers}
            >
              {dnd.renderBreadcrumbItem(content, item)}
            </ExternalFileDroppableBreadcrumb>
          )}
        />
        {breadcrumbExtra}
      </>
    );
  })();

  const toolbar = (
    <div className={styles.toolbarActions}>
      {!isEditMode && actionsController.showCreateMenu ? (
        <CreateMenu
          items={actionsController.createMenuItems}
          onSelect={actionsController.handleCreateMenuSelect}
        />
      ) : null}
      {!isEditMode && actionsController.showUploadToGroup ? (
        <Button variant="secondary" size="sm" onPress={actionsController.openUploadToGroup}>
          {t('table.addFromPersonal')}
        </Button>
      ) : null}
      {!isEditMode && trash.canOpenTrash ? (
        <Button
          variant={trash.isTrashView ? 'primary' : 'secondary'}
          size="sm"
          onPress={trash.openTrash}
        >
          <Trash2 size={16} aria-hidden="true" />
          {trash.isTrashView ? t('page.backToDrive') : t('node.trash')}
        </Button>
      ) : null}
      <AppIconButton
        icon={
          interaction.isDetailPanelCollapsed ? (
            <PanelRightOpen size={16} aria-hidden="true" />
          ) : (
            <PanelRightClose size={16} aria-hidden="true" />
          )
        }
        label={
          interaction.isDetailPanelCollapsed ? t('table.expandDetails') : t('table.collapseDetails')
        }
        size="sm"
        className={styles.detailPanelToggle}
        onPress={() => interaction.setIsDetailPanelCollapsed((collapsed) => !collapsed)}
      />
    </div>
  );

  const selectionFooter = (() => {
    if (!isEditMode) return null;
    return (
      <div className={styles.selectionActions}>
        {interaction.canBatchMove ? (
          <Button
            variant="secondary"
            size="sm"
            onPress={() => actionsController.setMoveNodes(interaction.selectedActionTargets)}
          >
            {t('table.move')}
          </Button>
        ) : null}
        {!trash.isTrashView ? (
          <Button
            variant="danger"
            size="sm"
            isDisabled={actionsController.batchDeleting}
            onPress={actionsController.runBatchDelete}
          >
            {t('actions.delete', { ns: 'common' })}
          </Button>
        ) : null}
        <Button variant="secondary" size="sm" onPress={interaction.clearChecked}>
          {t('table.clearSelection')}
        </Button>
      </div>
    );
  })();

  return (
    <DndContext
      sensors={dnd.sensors}
      collisionDetection={pointerWithin}
      onDragStart={dnd.handleDragStart}
      onDragEnd={dnd.handleDragEnd}
      onDragCancel={dnd.clearDragState}
    >
      <main className={styles.listArea}>
        <div className={styles.driveFrame}>
          <div className={styles.driveBody}>
            <div className={styles.tablePanel}>
              <FolderTable<DriveTableRow>
                ariaLabel={t('table.aria')}
                items={interaction.rows}
                columns={columns}
                loading={navigation.loading}
                breadcrumb={breadcrumb}
                toolbar={toolbar}
                expandedRowKeys={navigation.expandedRowKeys}
                onExpandedChange={navigation.handleExpandedChange}
                selectedRowKey={interaction.selectedRow?.id}
                onRowSelect={handleRowSelect}
                onRowActivate={handleClickNode}
                renderNameContent={renderNameContent}
                bodyDragHandlers={externalDnd.bodyDragHandlers}
                bodyOverlay={
                  externalDnd.isBackgroundDropActive ? (
                    <div className={styles.fileDropOverlay} aria-hidden="true">
                      {t('table.dropToUpload')}
                    </div>
                  ) : null
                }
                totalCount={interaction.currentDirectoryItemCount}
                summary={t('table.summary', { count: interaction.currentDirectoryItemCount })}
                className={styles.table}
                sortDescriptor={interaction.sortDescriptor}
                onSortChange={interaction.handleSortChange}
                isPinnedFirst={isDrivePinnedFirstRow}
                rowActions={resolveRowActions}
                isEditMode={isEditMode}
                checkboxSelection={checkboxSelection}
                selectionFooter={selectionFooter}
              />
            </div>
            <aside
              className={styles.detailPanel}
              data-collapsed={interaction.isDetailPanelCollapsed ? 'true' : undefined}
              aria-label={t('table.detailsAsideAria')}
            >
              {!interaction.isDetailPanelCollapsed ? (
                <DriveDetailPanel
                  key={interaction.selectedRow?.id ?? (isEditMode ? 'edit-mode' : 'empty')}
                  selectedRow={interaction.selectedRow}
                  isEditMode={isEditMode}
                  selectedCount={interaction.checkedRowKeys.size}
                  groupId={resolvedScope.groupId}
                  isTrashView={trash.isTrashView}
                  showManagePermission={actionsController.showManagePermission}
                  onActivate={handleClickNode}
                  onRename={actionsController.setRenameTarget}
                  onMoveNodes={actionsController.setMoveNodes}
                  onDelete={actionsController.setDeleteTarget}
                  onOpenTagAccessPermission={actionsController.openTagAccessPermission}
                  onOpenTagMountPermission={actionsController.openTagMountPermission}
                  onOpenResourcePermission={actionsController.openResourcePermission}
                />
              ) : null}
            </aside>
          </div>
        </div>
        {actionsController.ModalHost}
      </main>
      <DragOverlay>
        {dnd.activeDragRow && dnd.draggingCount > 0 ? (
          <DriveDragOverlay row={dnd.activeDragRow} count={dnd.draggingCount} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default TableDrive;
