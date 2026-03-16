import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { message, Breadcrumb, Table, Spin, Button, Tag } from 'antd';
import { LuChevronLeft, LuChevronRight, LuFolderPlus } from 'react-icons/lu';
import { getPathSegments } from '@/utils/path';
import type { ResourceItem } from '@/types/resource';
import type { Folder } from '@/types/folder';
import { useFolderService, useResourceService, useTagService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import {
  NewFolderModal,
  RenameFolderModal,
  DeleteFolderModal,
  RenameFileModal,
  DeleteFileModal,
  MoveToFolderModal,
  AddTagModal,
} from '@/components/Drive/Modals';
import type { MoveToFolderTarget } from '@/components/Drive/Modals';
import { useClickFile, useTreeDriveDrop } from '@/hooks/drive';
import type { RowItem, TreeDriveMode, TreeDriveProps } from './index.type';
import { buildTableDataSource } from './index.type';
import { getTreeDriveColumns, type TreeDriveColumnConfigOptions } from './config/columnConfig';
import {
  getTreeDriveRowProps,
  createOnRowClick,
  type TreeDriveRowConfigOptions,
} from './config/rowConfig';
import styles from './style.module.less';

const FOLDER_FILE_PAGE_SIZE = 20;

const TreeDrive: React.FC<TreeDriveProps> = ({ mode = 'folder' }) => {
  const folderService = useFolderService();
  const resourceService = useResourceService();
  const tagService = useTagService();
  const clickFile = useClickFile();

  // 路径状态
  const [folderPath, setFolderPath] = useState('/');
  const backStackRef = useRef<string[]>([]);
  const forwardStackRef = useRef<string[]>([]);
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);

  // 模态框状态
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [renameFolderModalOpen, setRenameFolderModalOpen] = useState(false);
  const [deleteFolderModalOpen, setDeleteFolderModalOpen] = useState(false);
  const [renameFileModalOpen, setRenameFileModalOpen] = useState(false);
  const [deleteFileModalOpen, setDeleteFileModalOpen] = useState(false);
  const [moveToFolderModalOpen, setMoveToFolderModalOpen] = useState(false);

  // 模态框目标
  const [renameFolderTarget, setRenameFolderTarget] = useState<Folder | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(null);
  const [renameFileTarget, setRenameFileTarget] = useState<ResourceItem | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<ResourceItem | null>(null);
  const [moveToFolderTarget, setMoveToFolderTarget] = useState<MoveToFolderTarget | null>(null);
  const [addTagModalOpen, setAddTagModalOpen] = useState(false);
  const [addTagTarget, setAddTagTarget] = useState<MoveToFolderTarget | null>(null);

  // 列表状态
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderFiles, setFolderFiles] = useState<ResourceItem[]>([]);
  const [totalFolderFiles, setTotalFolderFiles] = useState(0);
  const [folderLoading, setFolderLoading] = useState(false);
  const [folderLoadingMore, setFolderLoadingMore] = useState(false);

  // 滚动状态
  const folderFilePageRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 拖拽状态
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);
  const isDraggingRef = useRef(false);

  // 获取文件夹列表
  const fetchFolderList = useCallback(
    async (path: string, filePage = 1, append = false) => {
      if (filePage === 1) {
        setFolderLoading(true);
      } else {
        setFolderLoadingMore(true);
      }
      try {
        const res = await folderService.getResByFolder({
          path,
          filePage,
          filePageSize: FOLDER_FILE_PAGE_SIZE,
        });
        setFolders(res.folders);
        setTotalFolderFiles(res.totalFiles);
        if (append) {
          setFolderFiles((prev) => [...prev, ...res.files]);
        } else {
          setFolderFiles(res.files);
        }
      } catch (err) {
        message.error(parseErrorMessage(err, '获取列表失败'));
        if (!append) {
          setFolders([]);
          setFolderFiles([]);
          setTotalFolderFiles(0);
        }
      } finally {
        setFolderLoading(false);
        setFolderLoadingMore(false);
      }
    },
    [folderService]
  );

  // 刷新列表
  const refresh = useCallback(() => {
    folderFilePageRef.current = 1;
    fetchFolderList(folderPath, 1, false);
  }, [folderPath, fetchFolderList]);

  const { handleDrop, handleDropFolder } = useTreeDriveDrop({
    resourceService,
    tagService,
    refresh,
  });

  // 路径变化时，重新获取列表
  useEffect(() => {
    fetchFolderList(folderPath, 1, false);
  }, [folderPath, fetchFolderList]);

  // 路径变化时，重置分页
  useEffect(() => {
    folderFilePageRef.current = 1;
  }, [folderPath]);

  // 导航管理（包含点击文件夹导致的路径切换）
  const updateNavState = useCallback(() => {
    setCanBack(backStackRef.current.length > 0);
    setCanForward(forwardStackRef.current.length > 0);
  }, []);

  // 导航到新路径
  const navigateTo = useCallback(
    (newPath: string) => {
      const current = folderPath;
      if (newPath === current) return;
      backStackRef.current.push(current);
      forwardStackRef.current = [];
      setFolderPath(newPath);
      updateNavState();
    },
    [folderPath, updateNavState]
  );

  // 处理文件夹点击
  const handleFolderClick = useCallback(
    (folder: Folder) => {
      navigateTo(folder.tagName ?? '/');
    },
    [navigateTo]
  );

  // 处理路径点击
  const handlePathClick = useCallback(
    (path: string) => {
      navigateTo(path);
    },
    [navigateTo]
  );

  // 处理后退
  const handleBack = useCallback(() => {
    const prev = backStackRef.current.pop();
    if (prev == null) return;
    forwardStackRef.current.push(folderPath);
    setFolderPath(prev);
    updateNavState();
  }, [folderPath, updateNavState]);

  // 处理前进
  const handleForward = useCallback(() => {
    const next = forwardStackRef.current.pop();
    if (next == null) return;
    backStackRef.current.push(folderPath);
    setFolderPath(next);
    updateNavState();
  }, [folderPath, updateNavState]);

  // 处理新建文件夹
  const handleCreateFolder = useCallback(() => {
    setCreateFolderModalOpen(true);
  }, []);

  // 处理新建文件夹模态框关闭
  const handleCreateFolderModalClose = useCallback(() => {
    setCreateFolderModalOpen(false);
  }, []);

  // 处理重命名文件夹
  const handleRenameFolder = useCallback((folder: Folder) => {
    setRenameFolderTarget(folder);
    setRenameFolderModalOpen(true);
  }, []);

  // 处理重命名文件夹模态框关闭
  const handleRenameFolderModalClose = useCallback(() => {
    setRenameFolderModalOpen(false);
    setRenameFolderTarget(null);
  }, []);

  // 处理删除文件夹
  const handleDeleteFolder = useCallback((folder: Folder) => {
    setDeleteFolderTarget(folder);
    setDeleteFolderModalOpen(true);
  }, []);

  // 处理删除文件夹模态框关闭
  const handleDeleteFolderModalClose = useCallback(() => {
    setDeleteFolderModalOpen(false);
    setDeleteFolderTarget(null);
  }, []);

  // 处理重命名文件
  const handleRenameFile = useCallback((file: ResourceItem) => {
    setRenameFileTarget(file);
    setRenameFileModalOpen(true);
  }, []);

  // 处理重命名文件模态框关闭
  const handleRenameFileModalClose = useCallback(() => {
    setRenameFileModalOpen(false);
    setRenameFileTarget(null);
  }, []);

  // 处理删除文件
  const handleDeleteFile = useCallback((file: ResourceItem) => {
    setDeleteFileTarget(file);
    setDeleteFileModalOpen(true);
  }, []);

  // 处理删除文件模态框关闭
  const handleDeleteFileModalClose = useCallback(() => {
    setDeleteFileModalOpen(false);
    setDeleteFileTarget(null);
  }, []);

  // 处理移动到文件夹
  const handleMoveToFolder = useCallback((target: MoveToFolderTarget) => {
    setMoveToFolderTarget(target);
    setMoveToFolderModalOpen(true);
  }, []);

  // 处理移动到文件夹模态框关闭
  const handleMoveToFolderModalClose = useCallback(() => {
    setMoveToFolderModalOpen(false);
    setMoveToFolderTarget(null);
  }, []);

  // 处理添加标签（tag 模式下更多操作第一项，仅对 file 有效）
  const handleAddTag = useCallback((target: MoveToFolderTarget) => {
    setAddTagTarget(target);
    setAddTagModalOpen(true);
  }, []);

  const handleAddTagModalClose = useCallback(() => {
    setAddTagModalOpen(false);
    setAddTagTarget(null);
  }, []);

  // 处理加载更多
  const handleLoadMore = useCallback(() => {
    if (folderFiles.length >= totalFolderFiles) return;
    const nextPage = folderFilePageRef.current + 1;
    folderFilePageRef.current = nextPage;
    fetchFolderList(folderPath, nextPage, true);
  }, [folderPath, folderFiles.length, totalFolderFiles, fetchFolderList]);

  // 判断是否有更多
  const hasMore = folderFiles.length < totalFolderFiles;

  // 获取路径段
  const pathSegments = getPathSegments(folderPath);

  const dataSource = useMemo<RowItem[]>(
    () => buildTableDataSource(folders, folderFiles),
    [folders, folderFiles]
  );

  // 处理滚动
  useEffect(() => {
    if (!hasMore || folderLoadingMore || folderLoading) return;
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handleLoadMore();
      },
      { root, rootMargin: '100px', threshold: 0 }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [hasMore, folderLoadingMore, folderLoading, handleLoadMore]);

  const handleRowClick = useMemo(
    () =>
      createOnRowClick({
        isDraggingRef,
        onFolderClick: handleFolderClick,
        onFileClick: clickFile,
      }),
    [handleFolderClick, clickFile]
  );

  const getRowProps = useMemo(
    () =>
      getTreeDriveRowProps({
        mode,
        isDraggingRef,
        styles: styles as TreeDriveRowConfigOptions['styles'],
        onRowClick: handleRowClick,
        onDropFile: handleDrop,
        onDropFolder: handleDropFolder,
      }),
    [mode, handleRowClick, handleDrop, handleDropFolder]
  );

  const columns = useMemo(
    () =>
      getTreeDriveColumns({
        mode,
        styles: styles as TreeDriveColumnConfigOptions['styles'],
        openDropdownKey,
        setOpenDropdownKey,
        onMoveToFolder: handleMoveToFolder,
        onAddTag: handleAddTag,
        onRenameFolder: handleRenameFolder,
        onDeleteFolder: handleDeleteFolder,
        onRenameFile: handleRenameFile,
        onDeleteFile: handleDeleteFile,
      }),
    [
      mode,
      openDropdownKey,
      handleMoveToFolder,
      handleAddTag,
      handleRenameFolder,
      handleDeleteFolder,
      handleRenameFile,
      handleDeleteFile,
    ]
  );

  return (
    <>
      <main className={styles.listArea}>
        <div className={styles.wrapper}>
          <div className={styles.toolbar}>
            <div className={styles.navAndBreadcrumb}>
              <div className={styles.navButtons}>
                <Button
                  type="text"
                  size="small"
                  icon={<LuChevronLeft size={18} />}
                  disabled={!canBack}
                  onClick={handleBack}
                  aria-label="后退"
                />
                <Button
                  type="text"
                  size="small"
                  icon={<LuChevronRight size={18} />}
                  disabled={!canForward}
                  onClick={handleForward}
                  aria-label="前进"
                />
              </div>
              <Breadcrumb
                className={styles.breadcrumb}
                separator={mode === 'tag' ? '>' : '/'}
                items={
                  mode === 'tag'
                    ? pathSegments.slice(1).map((seg) => ({
                        title: (
                          <Button
                            type="text"
                            size="small"
                            ghost
                            onClick={() => handlePathClick(seg.path)}
                            className={styles.breadcrumbTagBtn}
                          >
                            <Tag>{seg.label}</Tag>
                          </Button>
                        ),
                      }))
                    : pathSegments.map((seg) => ({
                        title: (
                          <button
                            type="button"
                            onClick={() => handlePathClick(seg.path)}
                            className={styles.breadcrumbLink}
                          >
                            {seg.label}
                          </button>
                        ),
                      }))
                }
              />
            </div>
            {mode === 'folder' && (
              <Button
                type="default"
                size="small"
                icon={<LuFolderPlus size={16} />}
                onClick={handleCreateFolder}
              >
                新建文件夹
              </Button>
            )}
          </div>
          <div ref={scrollRef} className={styles.scrollArea}>
            <div className={styles.tableWrapper}>
              <Table<RowItem>
                dataSource={dataSource}
                columns={columns}
                loading={folderLoading}
                pagination={false}
                size="middle"
                onRow={(record) => getRowProps(record)}
              />
            </div>
            {hasMore && <div ref={sentinelRef} className={styles.sentinel} aria-hidden />}
            {folderLoadingMore && (
              <div style={{ textAlign: 'center', padding: 8 }}>
                <Spin size="small" />
              </div>
            )}
          </div>
        </div>
      </main>

      <NewFolderModal
        open={createFolderModalOpen}
        onCancel={handleCreateFolderModalClose}
        onSuccess={refresh}
        parentPath={folderPath}
      />

      <RenameFolderModal
        open={renameFolderModalOpen}
        onCancel={handleRenameFolderModalClose}
        onSuccess={refresh}
        folder={renameFolderTarget}
      />

      <DeleteFolderModal
        open={deleteFolderModalOpen}
        onCancel={handleDeleteFolderModalClose}
        onSuccess={refresh}
        folder={deleteFolderTarget}
      />

      <RenameFileModal
        open={renameFileModalOpen}
        onCancel={handleRenameFileModalClose}
        onSuccess={refresh}
        file={renameFileTarget}
      />

      <DeleteFileModal
        open={deleteFileModalOpen}
        onCancel={handleDeleteFileModalClose}
        onSuccess={refresh}
        file={deleteFileTarget}
      />

      <MoveToFolderModal
        open={moveToFolderModalOpen}
        onCancel={handleMoveToFolderModalClose}
        onSuccess={refresh}
        target={moveToFolderTarget}
      />

      <AddTagModal
        open={addTagModalOpen}
        onCancel={handleAddTagModalClose}
        onSuccess={refresh}
        target={addTagTarget}
      />
    </>
  );
};

export default TreeDrive;
export type { TreeDriveProps, TreeDriveMode, RowItem } from './index.type';
