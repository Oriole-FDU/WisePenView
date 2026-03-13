import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Dropdown, message } from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import FileTypeIcon from '@/components/Common/FileTypeIcon';
import { LuEllipsisVertical, LuPencil, LuTrash2, LuTag, LuCopy } from 'react-icons/lu';
import { formatSize } from '@/utils/format';
import type { ResourceItem } from '@/types/resource';
import { useResourceService, useNoteService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { RenameFileModal, DeleteFileModal, EditTagModal } from '@/components/Drive/Modals';
import { useClickFile } from '@/hooks/drive';
import type { FileListProps } from './index.type';
import styles from './style.module.less';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface ColumnBuildProps {
  onDelete: (record: ResourceItem) => void;
  onRename: (record: ResourceItem) => void;
  onEditTag: (record: ResourceItem) => void;
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
    dataIndex: 'tagNames',
    key: 'tagNames',
    width: 200,
    render: (tagNames?: string[]) =>
      tagNames?.length ? (
        <span className={styles.tagList}>
          {tagNames.map((t) => (
            <Tag variant="outlined" key={t}>
              {t}
            </Tag>
          ))}
        </span>
      ) : (
        '-'
      ),
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
            props.onEditTag(record);
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
          onOpenChange={(open) => props.setOpenDropdownKey(open ? record.resourceId : null)}
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
  const clickFile = useClickFile();
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [list, setList] = useState<ResourceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [renameFileModalOpen, setRenameFileModalOpen] = useState(false);
  const [deleteFileModalOpen, setDeleteFileModalOpen] = useState(false);
  const [editTagModalOpen, setEditTagModalOpen] = useState(false);
  const [renameFileTarget, setRenameFileTarget] = useState<ResourceItem | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<ResourceItem | null>(null);
  const [editTagTarget, setEditTagTarget] = useState<ResourceItem | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await resourceService.getUserResources({
        page,
        size: pageSize,
        sortBy: filter.sortBy,
        sortDir: filter.sortDir,
        tagQueryLogicMode: filter.tagQueryLogicMode,
        ...(filter.tagIds.length > 0 && { tagIds: filter.tagIds }),
        ...(groupId && { groupId }),
      });
      setList(res.list);
      setTotal(res.total);
    } catch (err) {
      message.error(parseErrorMessage(err, '获取资源列表失败'));
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    resourceService,
    page,
    pageSize,
    groupId,
    filter.sortBy,
    filter.sortDir,
    filter.tagQueryLogicMode,
    filter.tagIds,
  ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const filterTagIdsKey = filter.tagIds.join(',');
  useEffect(() => {
    setPage(1);
  }, [filterTagIdsKey, filter.tagQueryLogicMode, filter.sortBy, filter.sortDir]);

  const handleRenameFile = useCallback((file: ResourceItem) => {
    setRenameFileTarget(file);
    setRenameFileModalOpen(true);
  }, []);

  const handleRenameFileModalClose = useCallback(() => {
    setRenameFileModalOpen(false);
    setRenameFileTarget(null);
  }, []);

  const handleEditTag = useCallback((file: ResourceItem) => {
    setEditTagTarget(file);
    setEditTagModalOpen(true);
  }, []);

  const handleEditTagModalClose = useCallback(() => {
    setEditTagModalOpen(false);
    setEditTagTarget(null);
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
        const res = await noteService.duplicateNote({ source: file.resourceId });
        if (res.ok && res.doc_id) {
          message.success('副本已创建');
          fetchList();
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
    [noteService, fetchList, clickFile]
  );

  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  }, []);

  const dataSource = list.map((item) => ({
    ...item,
    key: item.resourceId,
  }));

  const columns = buildColumns({
    onDelete: handleDeleteFile,
    onRename: handleRenameFile,
    onEditTag: handleEditTag,
    onDuplicateNote: handleDuplicateNote,
    onCloseDropdown: () => setOpenDropdownKey(null),
    openDropdownKey,
    setOpenDropdownKey,
  });

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
                  onChange: handlePageChange,
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
      <EditTagModal
        open={editTagModalOpen}
        file={editTagTarget}
        groupId={groupId}
        onCancel={handleEditTagModalClose}
        onSuccess={fetchList}
      />
    </>
  );
};

export default FileList;
