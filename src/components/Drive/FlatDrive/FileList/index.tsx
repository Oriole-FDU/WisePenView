import EntryIcon from '@/components/Common/EntryIcon';
import IconText from '@/components/Common/IconText';
import { DeleteFileModal, EditStickerModal, RenameFileModal } from '@/components/Drive/Modals';
import { useResourceService } from '@/domains';
import type { ResourceItem } from '@/domains/Resource';
import { useNavigateResource } from '@/hooks/useNavigateResource';
import { parseErrorMessage } from '@/utils/error';
import { formatFileSize } from '@/utils/format/formatFileSize';
import { toast } from '@heroui/react';
import { usePagination } from 'ahooks';
import type { MenuProps } from 'antd';
import { Dropdown, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useMemo, useState } from 'react';
import { LuEllipsisVertical, LuPencil, LuTag, LuTrash2 } from 'react-icons/lu';
import type { FileListProps } from './index.type';
import styles from './style.module.less';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface ColumnBuildProps {
  onDelete: (record: ResourceItem) => void;
  onRename: (record: ResourceItem) => void;
  onEditSticker: (record: ResourceItem) => void;
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
      <IconText
        as="div"
        className={styles.nameCell}
        icon={<EntryIcon entryType="resource" resourceType={record.resourceType} color="#666" />}
        iconSize={18}
        gap="var(--ant-margin-sm)"
        ellipsis
      >
        {text || '未命名'}
      </IconText>
    ),
  },
  {
    title: '标签',
    dataIndex: 'currentTags',
    key: 'currentTags',
    width: 200,
    render: (raw?: Record<string, string>) => {
      const entries = raw ? Object.entries(raw).filter(([, name]) => !name.startsWith('/')) : [];
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
    render: (size: number) => formatFileSize(size),
  },
  {
    title: '',
    key: 'action',
    width: 56,
    align: 'right',
    render: (_: unknown, record: ResourceItem) => {
      const menuItems: MenuProps['items'] = [
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

function FileList({ groupId, filter }: FileListProps) {
  const resourceService = useResourceService();
  const navigateResource = useNavigateResource(groupId);
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
        toast.danger(parseErrorMessage(err));
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
        onCloseDropdown: () => setOpenDropdownKey(null),
        openDropdownKey,
        setOpenDropdownKey,
      }),
    [handleDeleteFile, handleRenameFile, handleEditSticker, openDropdownKey]
  );

  const handleRowClick = useCallback(
    (record: ResourceItem) => ({
      onClick: () => {
        if (!record.resourceId) return;
        navigateResource(record.resourceId, record.resourceType);
      },
    }),
    [navigateResource]
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

      {renameFileTarget ? (
        <RenameFileModal
          isOpen={renameFileModalOpen}
          file={renameFileTarget}
          onOpenChange={(open) => !open && handleRenameFileModalClose()}
          onSuccess={fetchList}
        />
      ) : null}
      <DeleteFileModal
        isOpen={deleteFileModalOpen}
        file={deleteFileTarget}
        onOpenChange={(open) => !open && handleDeleteFileModalClose()}
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
}

export default FileList;
