import React, { useState, useCallback, useMemo } from 'react';
import { Table, Button } from 'antd';
import { LuFolderPlus, LuChevronRight, LuChevronDown, LuHouse, LuUpload } from 'react-icons/lu';
import type { ResourceItem } from '@/types/resource';
import type { GroupFileOrgLogic } from '@/types/group';
import type { Folder } from '@/types/folder';
import { mapFolderToTagTreeNode } from '@/types/folder';
import type { TagTreeNode } from '@/services/Tag/index.type';
import { useFolderService } from '@/contexts/ServicesContext';
import { getFolderDisplayName } from '@/utils/path';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { useAppMessage } from '@/hooks/useAppMessage';
import {
  NewFolderModal,
  RenameFolderModal,
  DeleteFolderModal,
  RenameFileModal,
  DeleteFileModal,
  MoveToFolderModal,
  UploadFileToGroupModal,
  type MoveToFolderTarget,
} from '@/components/Drive/Modals';
import { useClickFile, useTreeDriveDrop, useTreeDrive } from '@/hooks/drive';
import type { ITreeDriveAdapter } from '@/hooks/drive/useTreeDrive.type';
import type { TreeRowItem } from '../index.type';
import { getTreeDriveColumns, type TreeDriveColumnConfigOptions } from '../config/columnConfig';
import {
  getTreeDriveRowProps,
  createOnRowClick,
  type TreeDriveRowConfigOptions,
} from '../config/rowConfig';
import styles from '../style.module.less';

export interface FolderDriveProps {
  groupId?: string;
  /** 只读：隐藏新建文件夹与行内操作，且不可拖拽移动 */
  readOnlyMode?: boolean;
  /** 是否展示「关联个人文件」入口（需同时传入 groupId；权限一般与新建文件夹一致） */
  allowUpload?: boolean;
  /** 小组文件组织方式；在开启 allowUpload 时用于第二步 TreeNav 与小组主盘一致 */
  fileOrgLogic?: GroupFileOrgLogic;
}

const FolderDrive: React.FC<FolderDriveProps> = ({
  groupId,
  readOnlyMode = false,
  allowUpload = false,
  fileOrgLogic,
}) => {
  const folderService = useFolderService();
  const message = useAppMessage();
  const clickFile = useClickFile();
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderParent, setNewFolderParent] = useState<Folder | null>(null);
  const [uploadToGroupOpen, setUploadToGroupOpen] = useState(false);

  // 将folderService的方法交给TreeDrive的适配器
  const adapter = useMemo<ITreeDriveAdapter>(
    () => ({
      loadTree: async (gid) =>
        mapFolderToTagTreeNode(await folderService.getFolderTree({ groupId: gid })),
      getNodeById: (nodeId, gid) => {
        const f = folderService.getFolderById(nodeId, gid);
        return f ? mapFolderToTagTreeNode(f) : undefined;
      },
      getNodeContents: async ({ node, filePage, filePageSize }) => {
        const res = await folderService.getResByFolder({ folder: node, filePage, filePageSize });
        return {
          childNodes: res.folders.map(mapFolderToTagTreeNode),
          files: res.files,
          totalFiles: res.totalFiles,
        };
      },
    }),
    [folderService]
  );

  const {
    treeData,
    loading,
    expandedKeys,
    breadcrumb,
    loadingMoreKeys,
    refresh,
    handleExpandChange,
    handleTreeNodeClick,
    handleLoadMore,
    resetCwd,
    navigateToIndex,
  } = useTreeDrive({ adapter, groupId, cwdStoreKey: 'folder' });

  const { handleDrop, handleDropFolder } = useTreeDriveDrop({ folderService, refresh });

  const handleOpenNewFolder = useCallback(async () => {
    try {
      const root = await folderService.getFolderTree({ groupId });
      const parent: Folder | undefined =
        breadcrumb.length === 0
          ? root
          : folderService.getFolderById(breadcrumb[breadcrumb.length - 1].tagId, groupId);
      if (!parent) {
        message.error('无法确定当前目录，请稍后重试');
        return;
      }
      setNewFolderParent(parent);
      setNewFolderOpen(true);
    } catch (err) {
      message.error(parseErrorMessage(err, '加载目录失败'));
    }
  }, [folderService, groupId, breadcrumb, message]);

  const handleCloseNewFolder = useCallback(() => {
    setNewFolderOpen(false);
    setNewFolderParent(null);
  }, []);

  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [renameFileTarget, setRenameFileTarget] = useState<ResourceItem | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<ResourceItem | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] = useState<Folder | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveToFolderTarget | null>(null);

  // 作为useMemo的依赖，使用useCallback来避免重复创建函数导致不断更新
  const handleRenameFolder = useCallback((node: TagTreeNode) => {
    setRenameFolderTarget(node as Folder);
  }, []);

  const handleDeleteFolder = useCallback((node: TagTreeNode) => {
    setDeleteFolderTarget(node as Folder);
  }, []);

  const handleRenameFile = useCallback((file: ResourceItem) => {
    setRenameFileTarget(file);
  }, []);

  const handleDeleteFile = useCallback((file: ResourceItem) => {
    setDeleteFileTarget(file);
  }, []);

  const handleMoveToFolder = useCallback((t: MoveToFolderTarget) => {
    setMoveTarget(t);
  }, []);

  const handleCloseMoveToFolder = useCallback(() => {
    setMoveTarget(null);
  }, []);

  const handleRowClick = useMemo(
    () =>
      createOnRowClick({
        getIsDragging: () => isDragging,
        onTreeNodeClick: handleTreeNodeClick,
        onTreeLeafClick: clickFile,
      }),
    [isDragging, handleTreeNodeClick, clickFile]
  );

  const getRowProps = useMemo(
    () =>
      getTreeDriveRowProps({
        mode: 'folder',
        readOnlyMode,
        setIsDragging,
        styles: styles as TreeDriveRowConfigOptions['styles'],
        onRowClick: handleRowClick,
        onDropFile: handleDrop,
        onDropFolder: handleDropFolder,
      }),
    [handleRowClick, handleDrop, handleDropFolder, readOnlyMode]
  );

  const columns = useMemo(
    () =>
      getTreeDriveColumns({
        mode: 'folder',
        readOnlyMode,
        styles: styles as TreeDriveColumnConfigOptions['styles'],
        openDropdownKey,
        setOpenDropdownKey,
        onMoveToFolder: handleMoveToFolder,
        onRenameFolder: handleRenameFolder,
        onDeleteFolder: handleDeleteFolder,
        onRenameFile: handleRenameFile,
        onDeleteFile: handleDeleteFile,
        onLoadMore: handleLoadMore,
        loadingMoreKeys,
      }),
    [
      readOnlyMode,
      openDropdownKey,
      handleMoveToFolder,
      handleRenameFolder,
      handleDeleteFolder,
      handleRenameFile,
      handleDeleteFile,
      handleLoadMore,
      loadingMoreKeys,
    ]
  );

  const expandIcon = useCallback(
    ({
      expanded,
      onExpand,
      record,
    }: {
      expanded: boolean;
      onExpand: (record: TreeRowItem, e: React.MouseEvent<HTMLElement>) => void;
      record: TreeRowItem;
    }) => {
      if (record._type !== 'folder') {
        return record._type === 'loadMore' ? null : <span className={styles.expandPlaceholder} />;
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
          <nav className={styles.breadcrumb}>
            <button
              type="button"
              className={`${styles.breadcrumbItem} ${breadcrumb.length === 0 ? styles.breadcrumbItemActive : ''}`}
              onClick={() => resetCwd()}
            >
              <LuHouse size={14} />
              <span>云盘</span>
            </button>
            {breadcrumb.map((item, idx) => (
              <React.Fragment key={item.tagId}>
                <LuChevronRight size={12} className={styles.breadcrumbSep} />
                <button
                  type="button"
                  className={`${styles.breadcrumbItem} ${idx === breadcrumb.length - 1 ? styles.breadcrumbItemActive : ''}`}
                  onClick={() => navigateToIndex(idx)}
                >
                  {getFolderDisplayName(item.tagName)}
                </button>
              </React.Fragment>
            ))}
          </nav>

          {((allowUpload && groupId) || !readOnlyMode) && (
            <div className={styles.toolbarActions}>
              {allowUpload && groupId ? (
                <Button
                  type="default"
                  size="small"
                  icon={<LuUpload size={16} />}
                  onClick={() => setUploadToGroupOpen(true)}
                >
                  上传文件
                </Button>
              ) : null}
              {!readOnlyMode ? (
                <Button
                  type="default"
                  size="small"
                  icon={<LuFolderPlus size={16} />}
                  onClick={handleOpenNewFolder}
                >
                  新建文件夹
                </Button>
              ) : null}
            </div>
          )}
        </div>

        <NewFolderModal
          open={newFolderOpen}
          parentFolder={newFolderParent}
          onCancel={handleCloseNewFolder}
          onSuccess={refresh}
        />

        <RenameFolderModal
          open={renameFolderTarget !== null}
          folder={renameFolderTarget}
          onCancel={() => setRenameFolderTarget(null)}
          onSuccess={refresh}
        />
        <DeleteFolderModal
          open={deleteFolderTarget !== null}
          folder={deleteFolderTarget}
          onCancel={() => setDeleteFolderTarget(null)}
          onSuccess={refresh}
        />
        <RenameFileModal
          open={renameFileTarget !== null}
          file={renameFileTarget}
          onCancel={() => setRenameFileTarget(null)}
          onSuccess={refresh}
        />
        <DeleteFileModal
          open={deleteFileTarget !== null}
          file={deleteFileTarget}
          onCancel={() => setDeleteFileTarget(null)}
          onSuccess={refresh}
        />

        <MoveToFolderModal
          open={moveTarget !== null}
          target={moveTarget}
          groupId={groupId}
          onCancel={handleCloseMoveToFolder}
          onSuccess={refresh}
        />

        {allowUpload && groupId && fileOrgLogic ? (
          <UploadFileToGroupModal
            open={uploadToGroupOpen}
            groupId={groupId}
            fileOrgLogic={fileOrgLogic}
            onCancel={() => setUploadToGroupOpen(false)}
            onSuccess={refresh}
          />
        ) : null}

        <div className={styles.scrollArea}>
          <div className={styles.tableWrapper}>
            <Table<TreeRowItem>
              dataSource={treeData}
              columns={columns}
              loading={loading}
              pagination={false}
              size="middle"
              rowKey="key"
              expandable={{
                expandedRowKeys: expandedKeys,
                onExpand: handleExpandChange,
                expandIcon,
                indentSize: 24,
              }}
              onRow={(record) => getRowProps(record)}
            />
          </div>
        </div>
      </div>
    </main>
  );
};

export default FolderDrive;
