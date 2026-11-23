import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';
import { type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import AppBreadcrumb from '@/components/base/AppBreadcrumb';
import { GuideAnchor } from '@/components/base/Guide';
import { FolderTable } from '@/components/base/Table';
import EntryIcon from '@/components/business/Icons/EntryIcon';
import {
  DRIVE_DETAIL_PANEL_WIDTH,
  DRIVE_LAYOUT_CHROME_HEIGHT_NORMAL,
  DRIVE_LAYOUT_CHROME_HEIGHT_SHORT,
  LAYOUT_HEIGHT_DENSITY,
} from '@/constants/layoutScale';
import { GUIDE_TOOL_ID } from '@/constants/tour';
import type { ResourceViewer } from '@/domains/Resource';
import { useViewportLayoutScale } from '@/hooks/useViewportLayoutScale';

import { buildDriveBreadcrumbItems } from '../common/driveBreadcrumb';
import {
  resolveCurrentFolderTagId,
  resolveDriveFolderVariant,
  resolveDriveScope,
} from '../common/driveComponentModel';
import { useDriveNavigation } from '../hooks/useDriveNavigation';
import { useOpenDriveNode } from '../hooks/useOpenDriveNode';
import {
  useDriveDetailGuide,
  useTableDriveActions,
  useTableDriveDnd,
  useTableDriveExternalDnd,
  useTableDriveInteraction,
  useTableDriveRowActions,
  useTableDriveTrash,
} from './hooks';
import type { DriveTableRow, TableDriveProps } from './index.type';
import DriveDetailPanel from './parts/DriveDetailPanel';
import {
  DriveDragOverlay,
  ExternalFileDroppableBreadcrumb,
  ExternalFileDropTarget,
} from './parts/DriveDnd';
import { driveDragOverlayModifiers } from './parts/DriveDnd/attachDragOverlayToCursor';
import DriveSelectionActions from './parts/DriveSelectionActions';
import DriveToolbar from './parts/DriveToolbar';
import styles from './style.module.scss';
import { buildDriveTableColumns, isDrivePinnedFirstRow } from './tableConfig';

const getDriveFrameCssVars = (isShort: boolean): CSSProperties => {
  const chromeHeight = isShort
    ? DRIVE_LAYOUT_CHROME_HEIGHT_SHORT
    : DRIVE_LAYOUT_CHROME_HEIGHT_NORMAL;

  return {
    '--table-drive-layout-max-height': `calc(100dvh - ${chromeHeight}px)`,
    '--table-drive-detail-panel-width': `${DRIVE_DETAIL_PANEL_WIDTH}px`,
  } as CSSProperties;
};

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
  const { heightDensity } = useViewportLayoutScale();
  const driveFrameCssVars = getDriveFrameCssVars(heightDensity === LAYOUT_HEIGHT_DENSITY.SHORT);

  // 解析作用域，派生 groupId / rootId / scope
  const resolvedScope = resolveDriveScope(scope, groupId, rootId);

  // 初始化导航控制器
  const navigation = useDriveNavigation({
    initialNodeId,
    scope: resolvedScope.scope,
    ready: !externalLoading,
    onPathError,
  });

  // 初始化交互控制器
  const interaction = useTableDriveInteraction({
    runtime: navigation.runtime,
    snapshot: navigation.snapshot,
    dataSource: navigation.dataSource,
    t,
  });
  useDriveDetailGuide(navigation.runtime);

  // 封装一个通用的节点操作成功回调，清理选中状态并刷新列表
  const handleNodeActionSuccess = () => {
    interaction.clearChecked();
  };

  // 初始化拖拽控制器
  const dnd = useTableDriveDnd({
    runtime: navigation.runtime,
    snapshot: navigation.snapshot,
    rowMap: interaction.rowMap,
    pathNodes: navigation.pathNodes,
    checkedRowKeys: interaction.selectedActionTargetKeys,
    onMoveSuccess: handleNodeActionSuccess,
    onMoveError: () => {
      void navigation.refresh();
    },
  });

  // 封装一个通用的进入目录回调，清理选中状态并刷新列表
  const handleEnterFolder = (nodeId: string) => {
    interaction.clearChecked();
    interaction.clearSelectedRow();
    dnd.clearDragState();
    onCurrentNodeChange?.(nodeId);
    void navigation.enterFolder(nodeId);
  };

  // 封装一个通用的点击节点回调，清理选中状态并刷新列表
  const openDriveNode = useOpenDriveNode({ enterFolder: handleEnterFolder });
  const handleActivateNode = (row: DriveTableRow, viewer?: ResourceViewer) => {
    if (row.node.type === 'loading') {
      void navigation.loadMoreChildren(row.node.parentId);
      return;
    }
    openDriveNode(row.node, viewer);
  };

  // 初始化回收站控制器
  const trash = useTableDriveTrash({
    currentNodeId: navigation.currentNodeId,
    pathNodes: navigation.pathNodes,
    scope: resolvedScope.scope,
  });

  const mountTagId = resolveCurrentFolderTagId(navigation.currentNodeId, navigation.pathNodes);
  const externalDnd = useTableDriveExternalDnd({
    pathTagId: mountTagId,
    isTrashView: trash.isTrashView,
    rowMap: interaction.rowMap,
    pathNodes: navigation.pathNodes,
    onUploadSuccess: () => {
      void navigation.refresh();
    },
  });

  const driveActions = useTableDriveActions({
    currentNodeId: navigation.currentNodeId,
    currentRows: interaction.rows,
    selectedActionTargets: interaction.selectedActionTargets,
    pathNodes: navigation.pathNodes,
    scope: resolvedScope.scope,
    actions,
    disabled: externalLoading,
    refresh: () => {
      void navigation.refresh();
    },
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
    hiddenKeys: interaction.systemRowKeys,
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

  const resolveRowActions = useTableDriveRowActions({
    groupId: resolvedScope.groupId,
    isEditMode,
    isTrashView: trash.isTrashView,
    showManagePermission: driveActions.showManagePermission,
    onEnterFolder: handleEnterFolder,
    onOpenNode: handleActivateNode,
    onRename: driveActions.setRenameTarget,
    onMoveNodes: driveActions.setMoveNodes,
    onDelete: driveActions.setDeleteTarget,
    onOpenTagAccessPermission: driveActions.openTagAccessPermission,
    onOpenTagMountPermission: driveActions.openTagMountPermission,
    onOpenResourcePermission: driveActions.openResourcePermission,
  });

  const renderNameContent = (content: ReactNode, row: DriveTableRow) => (
    <ExternalFileDropTarget isActive={externalDnd.activeDropRowId === row.id}>
      {dnd.renderNameContent(content, row)}
    </ExternalFileDropTarget>
  );

  const breadcrumb = (() => {
    const items = buildDriveBreadcrumbItems(navigation.pathNodes, resolvedScope.scope);
    return (
      <>
        <GuideAnchor id={GUIDE_TOOL_ID.drivePath} layout="area">
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
        </GuideAnchor>
        {breadcrumbExtra}
      </>
    );
  })();

  const toolbar = (
    <DriveToolbar
      showCreateMenu={!isEditMode && driveActions.showCreateMenu}
      createMenuItems={driveActions.createMenuItems}
      onSelectCreate={driveActions.handleCreateMenuSelect}
      showUploadToGroup={!isEditMode && driveActions.showUploadToGroup}
      onOpenUploadToGroup={driveActions.openUploadToGroup}
      detailPanelCollapsed={interaction.isDetailPanelCollapsed}
      onToggleDetailPanel={() => interaction.setIsDetailPanelCollapsed((collapsed) => !collapsed)}
    />
  );

  const selectionFooter = isEditMode ? (
    <DriveSelectionActions
      canMove={interaction.canMoveSelection}
      isTrashView={trash.isTrashView}
      deleting={driveActions.batchDeleting}
      onClear={interaction.clearChecked}
      onMove={() => driveActions.setMoveNodes(interaction.selectedActionTargets)}
      onDelete={driveActions.runBatchDelete}
    />
  ) : null;

  return (
    <DndContext
      sensors={dnd.sensors}
      collisionDetection={pointerWithin}
      onDragStart={dnd.handleDragStart}
      onDragEnd={dnd.handleDragEnd}
      onDragCancel={dnd.clearDragState}
    >
      <main className={styles.listArea}>
        <div className={styles.driveFrame} style={driveFrameCssVars}>
          <div className={styles.driveBody}>
            <div className={styles.tablePanel}>
              <GuideAnchor id={GUIDE_TOOL_ID.driveFiles} layout="fill">
                <FolderTable<DriveTableRow>
                  ariaLabel={t('table.aria')}
                  items={interaction.rows}
                  columns={columns}
                  loading={navigation.loading}
                  breadcrumb={breadcrumb}
                  toolbar={toolbar}
                  expandedRowKeys={navigation.expandedRowKeys}
                  onExpandedChange={(keys) => {
                    void navigation.handleExpandedChange(keys);
                  }}
                  selectedRowKey={interaction.selectedRow?.id}
                  onRowSelect={handleRowSelect}
                  onRowActivate={handleActivateNode}
                  renderEntryIcon={(row) => (
                    <EntryIcon
                      entryType={row.node.type === 'resource' ? 'resource' : row.node.type}
                      resourceType={
                        row.node.type === 'resource' ? row.node.resourceType : undefined
                      }
                      resourceIconType={
                        row.node.type === 'resource' || row.node.type === 'link'
                          ? row.node.resourceIconType
                          : undefined
                      }
                      folderVariant={resolveDriveFolderVariant(row.node)}
                    />
                  )}
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
              </GuideAnchor>
            </div>
            <aside
              className={styles.detailPanel}
              data-collapsed={interaction.isDetailPanelCollapsed ? 'true' : undefined}
              aria-label={t('table.detailsAsideAria')}
            >
              {!interaction.isDetailPanelCollapsed ? (
                <GuideAnchor id={GUIDE_TOOL_ID.driveDetailsOpen} layout="fill">
                  <DriveDetailPanel
                    key={interaction.selectedRow?.id ?? (isEditMode ? 'edit-mode' : 'empty')}
                    selectedRow={interaction.selectedRow}
                    isEditMode={isEditMode}
                    selectedCount={interaction.selectedActionTargets.length}
                  />
                </GuideAnchor>
              ) : null}
            </aside>
          </div>
        </div>
        {driveActions.ModalHost}
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
