import {
  DndContext,
  DragOverlay,
  type Modifier,
  type Modifiers,
  pointerWithin,
} from '@dnd-kit/core';
import { HardDrive, PanelRightClose, PanelRightOpen, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import AppBreadcrumb, { type AppBreadcrumbItem } from '@/components/base/AppBreadcrumb';
import { AppButton } from '@/components/base/Button';
import AppIconButton from '@/components/base/Button/AppIconButton';
import { FolderTable } from '@/components/base/Table';
import type { DriveNode, DriveNodeScope } from '@/domains/Drive';
import { buildDrivePath } from '@/utils/navigation/driveRoute';
import type { ResourceViewer } from '@/utils/navigation/resourceTarget';

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

const DRIVE_DRAG_OVERLAY_CURSOR_OFFSET = { x: 12, y: 12 };

function getDragActivatorCoordinates(event: Event | null): { x: number; y: number } | null {
  if (
    !event ||
    !('clientX' in event) ||
    !('clientY' in event) ||
    typeof event.clientX !== 'number' ||
    typeof event.clientY !== 'number'
  ) {
    return null;
  }

  return { x: event.clientX, y: event.clientY };
}

const attachDriveDragOverlayToCursor: Modifier = ({
  activatorEvent,
  activeNodeRect,
  transform,
}) => {
  const activatorCoordinates = getDragActivatorCoordinates(activatorEvent);
  if (!activatorCoordinates || !activeNodeRect) return transform;

  // DragOverlay 默认沿用整行的拖拽起点，这里改为让小提示固定跟随鼠标。
  return {
    ...transform,
    x:
      transform.x +
      activatorCoordinates.x -
      activeNodeRect.left +
      DRIVE_DRAG_OVERLAY_CURSOR_OFFSET.x,
    y:
      transform.y +
      activatorCoordinates.y -
      activeNodeRect.top +
      DRIVE_DRAG_OVERLAY_CURSOR_OFFSET.y,
  };
};

const driveDragOverlayModifiers: Modifiers = [attachDriveDragOverlayToCursor];

function toBreadcrumbItems(pathNodes: DriveNode[], scope: DriveNodeScope): AppBreadcrumbItem[] {
  return pathNodes.map((node, index) => ({
    key: node.id,
    label: (
      <>
        {index === 0 ? <HardDrive size={14} aria-hidden="true" /> : null}
        {getDriveNodeLabel(node)}
      </>
    ),
    ...(index < pathNodes.length - 1
      ? { to: buildDrivePath({ scope, nodeId: node.id }) }
      : { current: true }),
  }));
}

function TableDrive({
  groupId,
  rootId,
  initialNodeId,
  loading: externalLoading = false,
  onCurrentNodeChange,
  onPathError,
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
    ready: !externalLoading,
    onPathError,
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
    checkedRowKeys: interaction.selectedActionTargetKeys,
    onMoveSuccess: handleNodeActionSuccess,
    onMoveError: navigation.refresh,
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
  const handleActivateNode = (row: DriveTableRow, viewer?: ResourceViewer) => {
    if (row.node.type === 'loading') {
      void navigation.loadMoreChildren(row.node.parentId);
      return;
    }
    handleClickNode(row, viewer);
  };

  // 初始化回收站控制器
  const trash = useTableDriveTrashController({
    currentNodeId: navigation.currentNodeId,
    pathNodes: navigation.pathNodes,
    scope: resolvedScope.scope,
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
    selectedActionTargets: interaction.selectedActionTargets,
    pathNodes: navigation.pathNodes,
    scope: resolvedScope.scope,
    actions,
    disabled: externalLoading,
    refresh: navigation.refresh,
    mountTagId,
    isTrashView: trash.isTrashView,
    onNodeActionSuccess: handleNodeActionSuccess,
  });

  const columns = buildDriveTableColumns(t, resolvedScope.scope.type === 'group');
  const isEditMode = interaction.selectedActionTargets.length > 0;
  const checkboxSelection = {
    selectedKeys: interaction.selectedActionTargetKeys,
    onSelectionChange: (keys: Set<string>) => {
      interaction.setCheckedRowKeys(keys);
      if (keys.size > 0) {
        interaction.clearSelectedRow();
      }
    },
    hiddenKeys: interaction.sharedRowKeys,
  };

  const handleRowSelect = (row: DriveTableRow) => {
    if (row.node.type === 'loading') {
      void navigation.loadMoreChildren(row.node.parentId);
      return;
    }
    if (interaction.selectedRow?.id === row.id) {
      // 已选中状态，单击打开（checkbox 未生效时的策略）
      handleActivateNode(row);
    } else {
      interaction.setSelectedRowId(row.id);
    }
  };

  const resolveRowActions = useTableDriveRowActionsController({
    groupId: resolvedScope.groupId,
    isEditMode,
    isTrashView: trash.isTrashView,
    showManagePermission: actionsController.showManagePermission,
    onEnterFolder: handleEnterFolder,
    onOpenNode: handleActivateNode,
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
    const items = toBreadcrumbItems(navigation.pathNodes, resolvedScope.scope);
    return (
      <>
        <AppBreadcrumb
          items={items}
          ariaLabel={t('aria.folderPath', { ns: 'table' })}
          renderItem={(content, item) => (
            <ExternalFileDroppableBreadcrumb
              nodeId={item.key}
              isActive={externalDnd.activeBreadcrumbNodeId === item.key}
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
        <AppButton variant="secondary" size="sm" onPress={actionsController.openUploadToGroup}>
          {t('table.addFromPersonal')}
        </AppButton>
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
        <AppButton variant="secondary" size="sm" onPress={interaction.clearChecked}>
          {t('table.clearSelection')}
        </AppButton>
        {interaction.canMoveSelection ? (
          <AppButton
            variant="secondary"
            size="sm"
            onPress={() => actionsController.setMoveNodes(interaction.selectedActionTargets)}
          >
            {t('table.move')}
          </AppButton>
        ) : null}
        <AppButton
          variant="danger"
          size="sm"
          isDisabled={actionsController.batchDeleting}
          onPress={actionsController.runBatchDelete}
        >
          {trash.isTrashView ? t('delete.permanent') : t('actions.delete', { ns: 'common' })}
        </AppButton>
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
                onRowActivate={handleActivateNode}
                renderNameContent={renderNameContent}
                renderRow={dnd.renderRow}
                bodyDragHandlers={externalDnd.bodyDragHandlers}
                bodyOverlay={
                  externalDnd.isBackgroundDropActive ? (
                    <div className={styles.fileDropOverlay} aria-hidden="true">
                      {t('table.dropToUpload')}
                    </div>
                  ) : null
                }
                loadMore={{
                  loading: navigation.loadingMore,
                  hasMore: navigation.hasMore,
                  onLoadMore: navigation.loadMore,
                }}
                totalCount={navigation.totalCount}
                summary={t('table.summary', { count: navigation.totalCount })}
                className={styles.table}
                emptyText={trash.emptyText}
                emptyDescription={trash.emptyDescription}
                emptyIcon={trash.isTrashView ? <Trash2 size={20} aria-hidden /> : undefined}
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
                  selectedCount={interaction.selectedActionTargets.length}
                />
              ) : null}
            </aside>
          </div>
        </div>
        {actionsController.ModalHost}
      </main>
      <DragOverlay modifiers={driveDragOverlayModifiers}>
        {dnd.activeDragRow && dnd.draggingCount > 0 ? (
          <DriveDragOverlay row={dnd.activeDragRow} count={dnd.draggingCount} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default TableDrive;
