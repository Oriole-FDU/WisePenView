import React, { useState, useCallback, useMemo } from 'react';
import { Table, Tag, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePagination } from 'ahooks';
import FileTypeIcon from '@/components/Common/FileTypeIcon';
import { LuEllipsisVertical, LuPencil, LuTrash2, LuTag, LuCopy } from 'react-icons/lu';
import { formatSize } from '@/utils/format';
import type { ResourceItem } from '@/types/resource';
import { useResourceService, useNoteService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { RenameFileModal, DeleteFileModal, EditStickerModal } from '@/components/Drive/Modals';
import { useClickFile } from '@/hooks/drive';
import { useAppMessage } from '@/hooks/useAppMessage';
import type { FileListProps } from './index.type';
import styles from './style.module.less';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface ColumnBuildProps {
  onDelete: (record: ResourceItem) => void;
  onRename: (record: ResourceItem) => void;
  onEditSticker: (record: ResourceItem) => void;
  onDuplicateNote: (record: ResourceItem) => void;
  onCloseDropdown: () => void;
  openDropdownKey: string | null;
  setOpenDropdownKey: (key: string | null) => void;
}

const buildColumns = (props: ColumnBuildProps): ColumnsType<ResourceItem> => [
  {
    title: '名称',
    dataIndex: 'resourceName',
    key: 'resourceName',
    render: (text: string, record: ResourceItem) => (
      <div className={styles.nameCell}>
        <FileTypeIcon resourceType={record.resourceType} size={18} color="#666" />
        <span>{text || '未命名'}</span>
      </div>
    ),
  },
  {
    title: '标签',
    dataIndex: 'currentTags',
    key: 'currentTags',
    width: 200,
    render: (raw?: Record<string, string>) => {
      const entries = raw ? Object.entries(raw) : [];
      return entries.length ? (
        <span className={styles.tagList}>
          {entries.map(([id, name]) => (
            <Tag variant="outlined" key={id}>
              {name}
            </Tag>
          ))}
        </span>
      ) : (
        '-'
      );
    },
  },
  {
    title: '类型',
    dataIndex: 'resourceType',
    key: 'resourceType',
    width: 120,
    render: (t: string) => t || '-',
  },
  {
    title: '大小',
    dataIndex: 'size',
    key: 'size',
    width: 100,
    render: (size: number) => formatSize(size),
  },
  {
    title: '',
    key: 'action',
    width: 56,
    align: 'right',
    render: (_: unknown, record: ResourceItem) => {
      const menuItems: MenuProps['items'] = [
        ...(record.resourceType === 'NOTE'
          ? [
              {
                key: 'duplicate',
                label: '创建副本',
                icon: <LuCopy size={14} />,
                onClick: (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
                  info.domEvent.stopPropagation();
                  props.onCloseDropdown();
                  props.onDuplicateNote(record);
                },
              },
            ]
          : []),
        {
          key: 'editTag',
          label: '编辑标签',
          icon: <LuTag size={14} />,
          onClick: (info) => {
            // 防止点击事件冒泡到父级元素，导致文件打开
            info.domEvent.stopPropagation();
            props.onCloseDropdown();
            props.onEditSticker(record);
          },
        },
        {
          key: 'rename',
          label: '重命名',
          icon: <LuPencil size={14} />,
          onClick: (info) => {
            info.domEvent.stopPropagation();
            props.onCloseDropdown();
            props.onRename(record);
          },
        },
        {
          key: 'delete',
          label: '删除',
          icon: <LuTrash2 size={14} />,
          danger: true,
          onClick: (info) => {
            info.domEvent.stopPropagation();
            props.onCloseDropdown();
            props.onDelete(record);
          },
        },
      ];
      return (
        <Dropdown
          menu={{ items: menuItems }}
          trigger={['click']}
          placement="bottomRight"
          arrow={{ pointAtCenter: true }}
          getPopupContainer={() => document.body}
          open={props.openDropdownKey === record.resourceId}
          onOpenChange={(open) =>
            props.setOpenDropdownKey(open && record.resourceId != null ? record.resourceId : null)
          }
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

const FileList: React.FC<FileListProps> = ({ groupId, filter }) => {
  const resourceService = useResourceService();
  const noteService = useNoteService();
  const message = useAppMessage();
  const clickFile = useClickFile();
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);
  const [list, setList] = useState<ResourceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [renameFileModalOpen, setRenameFileModalOpen] = useState(false);
  const [deleteFileModalOpen, setDeleteFileModalOpen] = useState(false);
  const [editStickerModalOpen, setEditStickerModalOpen] = useState(false);
  const [renameFileTarget, setRenameFileTarget] = useState<ResourceItem | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<ResourceItem | null>(null);
  const [editStickerTarget, setEditStickerTarget] = useState<ResourceItem | null>(null);

  const {
    loading,
    refresh: fetchList,
    pagination: { current: page = 1, pageSize = DEFAULT_PAGE_SIZE, onChange: onPageChange },
  } = usePagination(
    async ({ current, pageSize }) => {
      const listParams = {
        page: current,
        size: pageSize,
        sortBy: filter.sortBy,
        sortDir: filter.sortDir,
        tagQueryLogicMode: filter.tagQueryLogicMode,
        ...(filter.tagIds.length > 0 && { tagIds: filter.tagIds }),
      };
      return groupId
        ? await resourceService.getGroupResources({ ...listParams, groupId })
        : await resourceService.getUserResources(listParams);
    },
    {
      defaultCurrent: 1,
      defaultPageSize: DEFAULT_PAGE_SIZE,
      refreshDeps: [
        resourceService,
        groupId,
        filter.sortBy,
        filter.sortDir,
        filter.tagQueryLogicMode,
        filter.tagIds,
      ],
      refreshDepsAction: () => {
        if (page !== 1) {
          onPageChange(1, pageSize);
          return;
        }
        void fetchList();
      },
      onSuccess: (res) => {
        setList(res.list);
        setTotal(res.total);
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '获取资源列表失败'));
        setList([]);
        setTotal(0);
      },
    }
  );

  const handleRenameFile = useCallback((file: ResourceItem) => {
    setRenameFileTarget(file);
    setRenameFileModalOpen(true);
  }, []);

  const handleRenameFileModalClose = useCallback(() => {
    setRenameFileModalOpen(false);
    setRenameFileTarget(null);
  }, []);

  const handleEditSticker = useCallback((file: ResourceItem) => {
    setEditStickerTarget(file);
    setEditStickerModalOpen(true);
  }, []);

  const handleEditStickerModalClose = useCallback(() => {
    setEditStickerModalOpen(false);
    setEditStickerTarget(null);
  }, []);

  const handleDeleteFile = useCallback((file: ResourceItem) => {
    setDeleteFileTarget(file);
    setDeleteFileModalOpen(true);
  }, []);

  const handleDeleteFileModalClose = useCallback(() => {
    setDeleteFileModalOpen(false);
    setDeleteFileTarget(null);
  }, []);

  const handleDuplicateNote = useCallback(
    async (file: ResourceItem) => {
      try {
        const res = await noteService.createNote({ source: file.resourceId });
        if (res.ok && res.resourceId) {
          message.success('副本已创建');
          fetchList();
          clickFile({
            ...file,
            resourceId: res.resourceId,
            resourceName: `${file.resourceName || '未命名'}（副本）`,
            resourceType: 'NOTE',
          });
        }
      } catch (err) {
        message.error(parseErrorMessage(err, '创建副本失败'));
      }
    },
    [noteService, fetchList, clickFile, message]
  );

  const dataSource = useMemo(
    () =>
      list.map((item) => ({
        ...item,
        key: item.resourceId,
      })),
    [list]
  );

  const columns = useMemo(
    () =>
      buildColumns({
        onDelete: handleDeleteFile,
        onRename: handleRenameFile,
        onEditSticker: handleEditSticker,
        onDuplicateNote: handleDuplicateNote,
        onCloseDropdown: () => setOpenDropdownKey(null),
        openDropdownKey,
        setOpenDropdownKey,
      }),
    [handleDeleteFile, handleRenameFile, handleEditSticker, handleDuplicateNote, openDropdownKey]
  );

  const handleRowClick = useCallback(
    (record: ResourceItem) => ({
      onClick: () => clickFile(record),
    }),
    [clickFile]
  );

  return (
    <>
      <div className={styles.wrapper} data-dropdown-open={!!openDropdownKey}>
        <Table<ResourceItem>
          dataSource={dataSource}
          columns={columns}
          loading={loading}
          onRow={handleRowClick}
          rowClassName={(record) =>
            openDropdownKey === record.resourceId ? styles.rowSelected : ''
          }
          pagination={
            total > 0
              ? {
                  current: page,
                  pageSize,
                  total,
                  showSizeChanger: true,
                  pageSizeOptions: PAGE_SIZE_OPTIONS,
                  showTotal: (t) => `共 ${t} 项`,
                  onChange: onPageChange,
                }
              : false
          }
        />
        {openDropdownKey && <div className={styles.mask} aria-hidden />}
      </div>

      <RenameFileModal
        open={renameFileModalOpen}
        file={renameFileTarget}
        onCancel={handleRenameFileModalClose}
        onSuccess={fetchList}
      />
      <DeleteFileModal
        open={deleteFileModalOpen}
        file={deleteFileTarget}
        onCancel={handleDeleteFileModalClose}
        onSuccess={fetchList}
      />
      <EditStickerModal
        open={editStickerModalOpen}
        file={editStickerTarget}
        onCancel={handleEditStickerModalClose}
        onSuccess={fetchList}
      />
    </>
  );
};

export default FileList;
