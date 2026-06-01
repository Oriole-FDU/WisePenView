import IconText from '@/components/Common/IconText';
import type { DriveNode } from '@/domains/Drive';
import { Button } from '@heroui/react';
import { Table } from 'antd';
import React, { useCallback, useMemo, useRef, type HTMLAttributes } from 'react';
import { AiOutlineCloudUpload } from 'react-icons/ai';
import { LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { resolveDriveScope } from '../common/driveComponentModel';
import { useClickNode } from '../common/useClickNode';
import {
  DRAG_TYPE_DRIVE_NODE,
  isDraggableDriveNode,
  isDropTargetDriveNode,
  useDriveDrop,
} from '../common/useDriveDrop';
import Breadcrumb from './components/Breadcrumb';
import { getTableDriveColumns } from './config/columnConfig';
import type { DriveRow, TableDriveProps } from './index.type';
import styles from './style.module.less';
import { useTableDrive } from './useTableDrive';
import { useTableDriveActions } from './useTableDriveActions';

function TableDrive({ groupId, rootId, scope, actions }: TableDriveProps) {
  const resolvedScope = React.useMemo(() => resolveDriveScope(scope, groupId), [scope, groupId]);
  const finalRootId = rootId ?? resolvedScope.rootId;
  const finalGroupId = resolvedScope.groupId;
  const {
    currentNodeId,
    dataSource,
    pathNodes,
    loading,
    loadingMoreParentId,
    expandedRowKeys,
    enterFolder,
    handleLoadMore,
    handleExpand,
    refresh,
  } = useTableDrive({ rootId: finalRootId, groupId: finalGroupId });

  const handleClickNode = useClickNode({
    enterFolder,
    loadMore: handleLoadMore,
    groupId: finalGroupId,
  });
  const { onDrop } = useDriveDrop({ refresh, groupId: finalGroupId });
  const {
    onRowAction,
    openDropdownKey,
    setOpenDropdownKey,
    showCreateFolder,
    showUploadToGroup,
    showManagePermission,
    openNewFolder,
    openUploadToGroup,
    openTagPermission,
    ModalHost,
  } = useTableDriveActions({
    currentNodeId,
    currentRows: dataSource,
    rootId: finalRootId,
    groupId: finalGroupId,
    actions,
    refresh,
  });

  // 仅在 drag 期间打开；drop / dragEnd 都会复位。useRef 避免触发 re-render，也避免 onClick 闭包旧值
  const isDraggingRef = useRef(false);

  const getRowProps = useCallback(
    (record: DriveRow): HTMLAttributes<HTMLTableRowElement> => {
      const base: HTMLAttributes<HTMLTableRowElement> = {
        onClick: () => {
          if (isDraggingRef.current) return;
          handleClickNode(record);
        },
        style: { cursor: 'pointer' },
      };

      // loadMore 行不参与 drag/drop
      if (record.type === 'loadMore') return base;

      if (isDraggableDriveNode(record)) {
        base.draggable = true;
        base.onDragStart = (e) => {
          isDraggingRef.current = true;
          e.dataTransfer.setData(DRAG_TYPE_DRIVE_NODE, JSON.stringify(record));
          e.dataTransfer.effectAllowed = 'move';
        };
        base.onDragEnd = () => {
          isDraggingRef.current = false;
        };
      }

      if (isDropTargetDriveNode(record)) {
        base.onDragOver = (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          e.currentTarget.classList.add(styles.droppableOver);
        };
        base.onDragLeave = (e) => {
          e.currentTarget.classList.remove(styles.droppableOver);
        };
        base.onDrop = (e) => {
          e.preventDefault();
          e.currentTarget.classList.remove(styles.droppableOver);
          const raw = e.dataTransfer.getData(DRAG_TYPE_DRIVE_NODE);
          if (!raw) return;
          try {
            const source = JSON.parse(raw) as DriveNode;
            void onDrop(source, record);
          } catch {
            // 非本系统拖拽数据，忽略
          }
        };
      }

      return base;
    },
    [handleClickNode, onDrop]
  );

  const columns = useMemo(
    () =>
      getTableDriveColumns({
        styles: {
          nameCell: styles.nameCell,
          loadMoreCell: styles.loadMoreCell,
          optionBtn: styles.optionBtn,
        },
        loadingMoreParentId,
        actionConfig: actions,
        onRowAction,
        openDropdownKey,
        setOpenDropdownKey,
      }),
    [actions, loadingMoreParentId, onRowAction, openDropdownKey, setOpenDropdownKey]
  );

  const expandIcon = useCallback(
    ({
      expanded,
      onExpand,
      record,
    }: {
      expanded: boolean;
      onExpand: (record: DriveRow, e: React.MouseEvent<HTMLElement>) => void;
      record: DriveRow;
    }) => {
      if (record.type !== 'folder') {
        return record.type === 'loadMore' ? null : <span className={styles.expandPlaceholder} />;
      }
      return (
        <button
          type="button"
          className={styles.expandBtn}
          onClick={(e) => {
            e.stopPropagation();
            onExpand(record, e);
          }}
        >
          {expanded ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
        </button>
      );
    },
    []
  );

  return (
    <main className={styles.listArea}>
      <div className={styles.wrapper}>
        <div className={styles.toolbar}>
          <Breadcrumb pathNodes={pathNodes} onJump={(node) => enterFolder(node.id)} />
          <div className={styles.toolbarActions}>
            {showUploadToGroup ? (
              <Button variant="secondary" size="sm" onPress={openUploadToGroup}>
                <IconText icon={<AiOutlineCloudUpload />} iconSize={16}>
                  上传文件
                </IconText>
              </Button>
            ) : null}
            {showManagePermission ? (
              <Button variant="secondary" size="sm" onPress={openTagPermission}>
                标签权限管理
              </Button>
            ) : null}
            {showCreateFolder ? (
              <Button variant="secondary" size="sm" onPress={openNewFolder}>
                新建文件夹
              </Button>
            ) : null}
          </div>
        </div>

        <div className={styles.scrollArea}>
          <div className={styles.tableWrapper}>
            <Table<DriveRow>
              rowKey="id"
              dataSource={dataSource}
              columns={columns}
              loading={loading}
              pagination={false}
              size="middle"
              expandable={{
                expandedRowKeys,
                onExpand: handleExpand,
                rowExpandable: (r) => r.type === 'folder',
                expandIcon,
                indentSize: 24,
              }}
              onRow={getRowProps}
            />
          </div>
        </div>
      </div>
      {ModalHost}
    </main>
  );
}

export default TableDrive;
