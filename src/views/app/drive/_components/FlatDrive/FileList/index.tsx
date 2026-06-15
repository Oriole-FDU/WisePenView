import EntryIcon from '@/components/Common/EntryIcon';
import IconText from '@/components/Common/IconText';
import { DataTable, type DataTableColumn } from '@/components/Table';
import { useResourceService } from '@/domains';
import type { ResourceItem } from '@/domains/Resource';
import { useNavigateResource } from '@/hooks/useNavigateResource';
import { parseErrorMessage } from '@/utils/error';
import { formatFileSize } from '@/utils/format/formatFileSize';
import { Chip, Dropdown, ListBox, Select, toast } from '@heroui/react';
import { usePagination } from 'ahooks';
import { EllipsisVertical, Pencil, Tag as TagIcon, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import DeleteFileModal from '../../DeleteFileModal';
import EditStickerModal from '../../EditStickerModal';
import RenameFileModal from '../../RenameFileModal';
import type { FileListProps } from './index.type';
import styles from './style.module.less';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

type ResourceTableRow = ResourceItem & {
  tableRowKey: string;
};

interface ColumnBuildProps {
  onDelete: (record: ResourceTableRow) => void;
  onRename: (record: ResourceTableRow) => void;
  onEditSticker: (record: ResourceTableRow) => void;
  onOpenResource: (record: ResourceTableRow) => void;
  onCloseDropdown: () => void;
  openDropdownKey: string | null;
  setOpenDropdownKey: (key: string | null) => void;
}

const buildColumns = (props: ColumnBuildProps): DataTableColumn<ResourceTableRow>[] => [
  {
    id: 'resourceName',
    label: '名称',
    width: 'fill',
    isRowHeader: true,
    renderCell: (record) => (
      <button
        type="button"
        className={styles.cellButton}
        onClick={() => props.onOpenResource(record)}
      >
        <IconText
          className={styles.nameCell}
          icon={<EntryIcon entryType="resource" resourceType={record.resourceType} color="#666" />}
          iconSize={18}
          gap="var(--space-sm)"
          ellipsis
        >
          {record.resourceName || '未命名'}
        </IconText>
      </button>
    ),
  },
  {
    id: 'currentTags',
    label: '标签',
    width: 'lg',
    renderCell: (record) => {
      const raw = record.currentTags;
      const entries = raw ? Object.entries(raw).filter(([, name]) => !name.startsWith('/')) : [];
      return (
        <button
          type="button"
          className={styles.cellButton}
          onClick={() => props.onOpenResource(record)}
        >
          {entries.length ? (
            <span className={styles.tagList}>
              {entries.map(([id, name]) => (
                <Chip key={id} size="sm" variant="secondary" className={styles.tagChip}>
                  <Chip.Label>{name}</Chip.Label>
                </Chip>
              ))}
            </span>
          ) : (
            '-'
          )}
        </button>
      );
    },
  },
  {
    id: 'resourceType',
    label: '类型',
    width: 'sm',
    renderCell: (record) => (
      <button
        type="button"
        className={styles.cellButton}
        onClick={() => props.onOpenResource(record)}
      >
        {record.resourceType || '-'}
      </button>
    ),
  },
  {
    id: 'size',
    label: '大小',
    width: 'sm',
    renderCell: (record) => (
      <button
        type="button"
        className={styles.cellButton}
        onClick={() => props.onOpenResource(record)}
      >
        {formatFileSize(record.size)}
      </button>
    ),
  },
  {
    id: 'action',
    label: '',
    width: 'sm',
    align: 'end',
    renderCell: (record) => {
      return (
        <Dropdown
          isOpen={props.openDropdownKey === record.resourceId}
          onOpenChange={(open) => {
            props.setOpenDropdownKey(open && record.resourceId != null ? record.resourceId : null);
          }}
        >
          <Dropdown.Trigger>
            <button
              type="button"
              className={styles.optionBtn}
              aria-label="更多操作"
              onClick={(e) => e.stopPropagation()}
            >
              <EllipsisVertical size={18} />
            </button>
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom end" className={styles.actionDropdownPopover}>
            <Dropdown.Menu
              aria-label="文件操作"
              onAction={(key) => {
                props.onCloseDropdown();
                if (key === 'editTag') {
                  props.onEditSticker(record);
                  return;
                }
                if (key === 'rename') {
                  props.onRename(record);
                  return;
                }
                if (key === 'delete') {
                  props.onDelete(record);
                }
              }}
            >
              <Dropdown.Item key="editTag" id="editTag" textValue="编辑标签">
                <IconText icon={<TagIcon />} iconSize={14} gap="var(--space-xs)">
                  编辑标签
                </IconText>
              </Dropdown.Item>
              <Dropdown.Item key="rename" id="rename" textValue="重命名">
                <IconText icon={<Pencil />} iconSize={14} gap="var(--space-xs)">
                  重命名
                </IconText>
              </Dropdown.Item>
              <Dropdown.Item key="delete" id="delete" textValue="删除" variant="danger">
                <IconText icon={<Trash2 />} iconSize={14} gap="var(--space-xs)">
                  删除
                </IconText>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
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

  const handleRenameFileModalClose = () => {
    setRenameFileModalOpen(false);
    setRenameFileTarget(null);
  };

  const handleEditStickerModalClose = () => {
    setEditStickerModalOpen(false);
    setEditStickerTarget(null);
  };

  const handleDeleteFileModalClose = () => {
    setDeleteFileModalOpen(false);
    setDeleteFileTarget(null);
  };

  const dataSource = useMemo<ResourceTableRow[]>(
    () =>
      list.map((item) => ({
        ...item,
        tableRowKey: item.resourceId ?? `${item.resourceName}-${item.resourceType}`,
      })),
    [list]
  );

  const handleOpenResource = useCallback(
    (record: ResourceItem) => {
      if (!record.resourceId) return;
      navigateResource(record.resourceId, record.resourceType);
    },
    [navigateResource]
  );

  const columns = useMemo(
    () =>
      buildColumns({
        onDelete: (file) => {
          setDeleteFileTarget(file);
          setDeleteFileModalOpen(true);
        },
        onRename: (file) => {
          setRenameFileTarget(file);
          setRenameFileModalOpen(true);
        },
        onEditSticker: (file) => {
          setEditStickerTarget(file);
          setEditStickerModalOpen(true);
        },
        onOpenResource: handleOpenResource,
        onCloseDropdown: () => setOpenDropdownKey(null),
        openDropdownKey,
        setOpenDropdownKey,
      }),
    [handleOpenResource, openDropdownKey]
  );

  return (
    <>
      <div className={styles.wrapper} data-dropdown-open={!!openDropdownKey}>
        <DataTable<ResourceTableRow>
          ariaLabel="文件列表"
          rowKey="tableRowKey"
          items={dataSource}
          columns={columns}
          loading={loading}
          emptyText="暂无文件"
          getRowClassName={(record) =>
            `${styles.clickableRow} ${openDropdownKey === record.resourceId ? styles.rowSelected : ''}`
          }
          pagination={
            total > 0
              ? {
                  current: page,
                  pageSize,
                  total,
                  summary: `共 ${total} 项`,
                  onChange: onPageChange,
                  pageSizeControl: (
                    <Select
                      aria-label="每页数量"
                      value={String(pageSize)}
                      onChange={(key) => {
                        if (key == null || Array.isArray(key)) return;
                        onPageChange(1, Number(key));
                      }}
                      className={styles.pageSizeSelect}
                    >
                      <Select.Trigger>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {PAGE_SIZE_OPTIONS.map((size) => (
                            <ListBox.Item
                              key={String(size)}
                              id={String(size)}
                              textValue={`${size} 条/页`}
                            >
                              {size} 条/页
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  ),
                }
              : undefined
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
        isOpen={editStickerModalOpen}
        file={editStickerTarget}
        onOpenChange={(open) => !open && handleEditStickerModalClose()}
        onSuccess={fetchList}
      />
    </>
  );
}

export default FileList;
