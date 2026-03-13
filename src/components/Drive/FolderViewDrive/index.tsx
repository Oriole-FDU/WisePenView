import React, { useState, useEffect, useCallback, useRef } from 'react';
import { message, Breadcrumb, Table, Spin, Dropdown, Button } from 'antd';
import type { MenuProps } from 'antd';
import { AiOutlineFolder } from 'react-icons/ai';
import FileTypeIcon from '@/components/Common/FileTypeIcon';
import {
  LuEllipsisVertical,
  LuPencil,
  LuTrash2,
  LuFilePen,
  LuChevronLeft,
  LuChevronRight,
  LuFolderPlus,
  LuFolderInput,
  LuCopy,
} from 'react-icons/lu';
import { formatSize } from '@/utils/format';
import { getPathSegments, getFolderDisplayName } from '@/utils/path';
import type { ResourceItem } from '@/types/resource';
import type { Folder } from '@/types/folder';
import {
  useFolderService,
  useResourceService,
  useTagService,
  useNoteService,
} from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import {
  NewFolderModal,
  RenameFolderModal,
  DeleteFolderModal,
  RenameFileModal,
  DeleteFileModal,
  MoveToFolderModal,
} from '@/components/Drive/Modals';
import type { MoveToFolderTarget } from '@/components/Drive/Modals';
import { useClickFile } from '@/hooks/drive';
import styles from './style.module.less';

const FOLDER_FILE_PAGE_SIZE = 20;

// html5原生拖拽
const DRAG_TYPE_FILE = 'application/x-wisepen-folder-file';
const DRAG_TYPE_FOLDER = 'application/x-wisepen-folder-folder';

type RowItem =
  | { key: string; _type: 'folder'; data: Folder }
  | { key: string; _type: 'file'; data: ResourceItem };

const FolderViewDrive: React.FC = () => {
  const folderService = useFolderService();
  const resourceService = useResourceService();
  const tagService = useTagService();
  const noteService = useNoteService();
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

  // 处理创建副本（仅 NOTE 类型）
  const handleDuplicateNote = useCallback(
    async (file: ResourceItem) => {
      try {
        const res = await noteService.duplicateNote({ source: file.resourceId });
        if (res.ok && res.doc_id) {
          message.success('副本已创建');
          refresh();
          clickFile({
            ...file,
            resourceId: res.doc_id,
            resourceName: `${file.resourceName || '未命名'}（副本）`,
            resourceType: 'NOTE',
          });
        }
      } catch (err) {
        message.error(parseErrorMessage(err, '创建副本失败'));
      }
    },
    [noteService, refresh, clickFile]
  );

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

  // 处理拖拽文件到文件夹
  const handleDrop = useCallback(
    async (file: ResourceItem, targetFolder: Folder) => {
      const targetPath = targetFolder.tagName ?? '/';
      try {
        await resourceService.updateResourcePath({
          resourceId: file.resourceId,
          path: targetPath,
        });
        message.success(`已移动到 ~${targetPath === '/' ? '根目录' : targetPath}`);
        refresh();
      } catch (err) {
        message.error(parseErrorMessage(err, '移动失败'));
      }
    },
    [resourceService, refresh]
  );

  // 处理拖拽文件夹到文件夹
  const handleDropFolder = useCallback(
    async (folder: Folder, targetFolder: Folder) => {
      try {
        await tagService.moveTag({
          targetTagId: folder.tagId,
          newParentId: targetFolder.tagId,
        });
        message.success(`已将「${folder.tagName}」移动到「${targetFolder.tagName}」下`);
        refresh();
      } catch (err) {
        message.error(parseErrorMessage(err, '移动失败'));
      }
    },
    [tagService, refresh]
  );

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
  const dataSource: RowItem[] = [
    ...folders.map((f) => ({
      key: `folder-${f.tagId}`,
      _type: 'folder' as const,
      data: f,
    })),
    ...folderFiles.map((f) => ({
      key: `file-${f.resourceId}`,
      _type: 'file' as const,
      data: f,
    })),
  ];

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

  // 处理行点击
  const handleRowClick = useCallback(
    (record: RowItem) => {
      if (isDraggingRef.current) return;
      if (record._type === 'folder') {
        handleFolderClick(record.data);
      } else {
        clickFile(record.data);
      }
    },
    [handleFolderClick, clickFile]
  );

  // 获取行属性
  const getRowProps = useCallback(
    (record: RowItem): React.HTMLAttributes<HTMLTableRowElement> => {
      const base = {
        onClick: () => handleRowClick(record),
        style: { cursor: 'pointer' as const },
      };

      if (record._type === 'file') {
        return {
          ...base,
          draggable: true,
          onDragStart: (e: React.DragEvent) => {
            isDraggingRef.current = true;
            e.dataTransfer.setData(DRAG_TYPE_FILE, JSON.stringify(record.data));
            e.dataTransfer.effectAllowed = 'move';
          },
          onDragEnd: () => {
            isDraggingRef.current = false;
          },
        };
      }

      if (record._type === 'folder') {
        const rowProps: React.HTMLAttributes<HTMLTableRowElement> = {
          ...base,
          onDragOver: (e: React.DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            e.currentTarget.classList.add(styles.droppableOver);
          },
          onDragLeave: (e: React.DragEvent) => {
            e.currentTarget.classList.remove(styles.droppableOver);
          },
          onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            e.currentTarget.classList.remove(styles.droppableOver);
            const fileRaw = e.dataTransfer.getData(DRAG_TYPE_FILE);
            const folderRaw = e.dataTransfer.getData(DRAG_TYPE_FOLDER);
            if (fileRaw) {
              try {
                const file = JSON.parse(fileRaw) as ResourceItem;
                handleDrop(file, record.data);
              } catch {
                // ignore
              }
            } else if (folderRaw) {
              try {
                const folder = JSON.parse(folderRaw) as Folder;
                const target = record.data;
                if (folder.tagId === target.tagId) return;
                if ((target.tagName ?? '').startsWith((folder.tagName ?? '') + '/')) return;
                handleDropFolder(folder, target);
              } catch {
                // ignore
              }
            }
          },
          draggable: true,
          onDragStart: (e: React.DragEvent) => {
            isDraggingRef.current = true;
            e.dataTransfer.setData(DRAG_TYPE_FOLDER, JSON.stringify(record.data));
            e.dataTransfer.effectAllowed = 'move';
          },
          onDragEnd: () => {
            isDraggingRef.current = false;
          },
        };
        return rowProps;
      }

      return base;
    },
    [handleRowClick, handleDrop, handleDropFolder]
  );

  const columns = [
    {
      title: <span className={styles.nameHeader}>名称</span>,
      dataIndex: '_',
      key: 'name',
      render: (_: unknown, record: RowItem) => (
        <div className={styles.nameCell}>
          {record._type === 'folder' ? (
            <AiOutlineFolder size={20} color="var(--ant-color-warning)" />
          ) : (
            <FileTypeIcon
              resourceType={record.data.resourceType}
              size={18}
              color="var(--ant-color-text-secondary)"
            />
          )}
          <span>
            {record._type === 'folder'
              ? getFolderDisplayName(record.data.tagName)
              : record.data.resourceName || '未命名'}
          </span>
        </div>
      ),
    },
    {
      title: '大小',
      key: 'size',
      width: 100,
      render: (_: unknown, record: RowItem) =>
        record._type === 'file' ? formatSize(record.data.size) : '-',
    },
    {
      title: '类型',
      key: 'type',
      width: 100,
      render: (_: unknown, record: RowItem) =>
        record._type === 'folder' ? '文件夹' : (record.data.resourceType ?? '-'),
    },
    {
      title: '',
      key: 'action',
      width: 56,
      align: 'right' as const,
      render: (_: unknown, record: RowItem) => {
        const rowKey = record.key;
        const menuItems: MenuProps['items'] =
          record._type === 'folder'
            ? [
                {
                  key: 'move',
                  label: '移动到文件夹',
                  icon: <LuFolderInput size={14} />,
                  onClick: (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
                    info.domEvent.stopPropagation();
                    setOpenDropdownKey(null);
                    handleMoveToFolder({ type: 'folder', data: record.data });
                  },
                },
                {
                  key: 'rename',
                  label: '重命名',
                  icon: <LuPencil size={14} />,
                  onClick: (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
                    info.domEvent.stopPropagation();
                    setOpenDropdownKey(null);
                    handleRenameFolder(record.data);
                  },
                },
                {
                  key: 'delete',
                  label: '删除',
                  icon: <LuTrash2 size={14} />,
                  danger: true,
                  onClick: (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
                    info.domEvent.stopPropagation();
                    setOpenDropdownKey(null);
                    handleDeleteFolder(record.data);
                  },
                },
              ]
            : [
                ...(record.data.resourceType === 'NOTE'
                  ? [
                      {
                        key: 'duplicate',
                        label: '创建副本',
                        icon: <LuCopy size={14} />,
                        onClick: (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
                          info.domEvent.stopPropagation();
                          setOpenDropdownKey(null);
                          handleDuplicateNote(record.data);
                        },
                      },
                    ]
                  : []),
                {
                  key: 'move',
                  label: '移动到文件夹',
                  icon: <LuFolderInput size={14} />,
                  onClick: (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
                    info.domEvent.stopPropagation();
                    setOpenDropdownKey(null);
                    handleMoveToFolder({ type: 'file', data: record.data });
                  },
                },
                {
                  key: 'rename',
                  label: '重命名',
                  icon: <LuPencil size={14} />,
                  onClick: (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
                    info.domEvent.stopPropagation();
                    setOpenDropdownKey(null);
                    handleRenameFile(record.data);
                  },
                },
                {
                  key: 'delete',
                  label: '删除',
                  icon: <LuTrash2 size={14} />,
                  danger: true,
                  onClick: (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
                    info.domEvent.stopPropagation();
                    setOpenDropdownKey(null);
                    handleDeleteFile(record.data);
                  },
                },
              ].filter(Boolean);
        if (menuItems.length === 0) return null;
        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement="bottomRight"
            arrow={{ pointAtCenter: true }}
            getPopupContainer={() => document.body}
            open={openDropdownKey === rowKey}
            onOpenChange={(open) => setOpenDropdownKey(open ? rowKey : null)}
          >
            <button
              type="button"
              className={styles.optionBtn}
              aria-label="更多操作"
              onClick={(e) => e.stopPropagation()}
            >
              <LuEllipsisVertical size={18} />
            </button>
          </Dropdown>
        );
      },
    },
  ];

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
                items={pathSegments.map((seg) => ({
                  title: (
                    <button
                      type="button"
                      onClick={() => handlePathClick(seg.path)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: 'inherit',
                        fontSize: 'inherit',
                      }}
                    >
                      {seg.label}
                    </button>
                  ),
                }))}
              />
            </div>
            <Button
              type="default"
              size="small"
              icon={<LuFolderPlus size={16} />}
              onClick={handleCreateFolder}
            >
              新建文件夹
            </Button>
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
    </>
  );
};

export default FolderViewDrive;
