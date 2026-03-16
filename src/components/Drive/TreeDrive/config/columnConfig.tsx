import React from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AiOutlineFolder, AiOutlineTag } from 'react-icons/ai';
import FileTypeIcon from '@/components/Common/FileTypeIcon';
import { LuEllipsisVertical, LuPencil, LuTrash2, LuFolderInput, LuTag } from 'react-icons/lu';
import { formatSize } from '@/utils/format';
import { getFolderDisplayName } from '@/utils/path';
import type { ResourceItem } from '@/types/resource';
import type { Folder } from '@/types/folder';
import type { MoveToFolderTarget } from '@/components/Drive/Modals';
import type { RowItem, TreeDriveMode } from '../index.type';

export interface TreeDriveColumnConfigOptions {
  /** 视图模式：tag 时树节点用 tag 图标 */
  mode: TreeDriveMode;
  styles: {
    nameHeader: string;
    nameCell: string;
    optionBtn: string;
  };
  openDropdownKey: string | null;
  setOpenDropdownKey: (key: string | null) => void;
  onMoveToFolder: (target: MoveToFolderTarget) => void;
  /** tag 模式下点击「添加标签」时调用 */
  onAddTag?: (target: MoveToFolderTarget) => void;
  onRenameFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  onRenameFile: (file: ResourceItem) => void;
  onDeleteFile: (file: ResourceItem) => void;
}

export function getTreeDriveColumns(options: TreeDriveColumnConfigOptions): ColumnsType<RowItem> {
  const {
    mode,
    styles,
    openDropdownKey,
    setOpenDropdownKey,
    onMoveToFolder,
    onAddTag,
    onRenameFolder,
    onDeleteFolder,
    onRenameFile,
    onDeleteFile,
  } = options;

  return [
    {
      title: <span className={styles.nameHeader}>名称</span>,
      dataIndex: '_',
      key: 'name',
      render: (_: unknown, record: RowItem) => (
        <div className={styles.nameCell}>
          {record._type === 'folder' ? (
            mode === 'tag' ? (
              <AiOutlineTag size={20} color="var(--ant-color-primary)" />
            ) : (
              <AiOutlineFolder size={20} color="var(--ant-color-warning)" />
            )
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
        record._type === 'folder'
          ? mode === 'tag'
            ? '标签'
            : '文件夹'
          : (record.data.resourceType ?? '-'),
    },
    {
      title: '',
      key: 'action',
      width: 56,
      align: 'right',
      render: (_: unknown, record: RowItem) => {
        const rowKey = record.key;
        const showAddTag = mode === 'tag' && record._type === 'file';
        const showMoveToFolder = mode === 'folder';
        const handleAddTag = (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
          info.domEvent.stopPropagation();
          setOpenDropdownKey(null);
          onAddTag?.({ type: 'file', data: record.data as ResourceItem });
        };
        const handleMoveToFolder = (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
          info.domEvent.stopPropagation();
          setOpenDropdownKey(null);
          onMoveToFolder(
            record._type === 'folder'
              ? { type: 'folder', data: record.data }
              : { type: 'file', data: record.data }
          );
        };
        const firstItem: MenuProps['items'] =
          showAddTag && onAddTag
            ? [
                {
                  key: 'addTag',
                  label: '添加标签',
                  icon: <LuTag size={14} />,
                  onClick: handleAddTag,
                },
              ]
            : showMoveToFolder
              ? [
                  {
                    key: 'move',
                    label: '移动到文件夹',
                    icon: <LuFolderInput size={14} />,
                    onClick: handleMoveToFolder,
                  },
                ]
              : [];
        const menuItems: MenuProps['items'] =
          record._type === 'folder'
            ? [
                ...firstItem,
                {
                  key: 'rename',
                  label: '重命名',
                  icon: <LuPencil size={14} />,
                  onClick: (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
                    info.domEvent.stopPropagation();
                    setOpenDropdownKey(null);
                    onRenameFolder(record.data as Folder);
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
                    onDeleteFolder(record.data as Folder);
                  },
                },
              ]
            : [
                ...firstItem,
                {
                  key: 'rename',
                  label: '重命名',
                  icon: <LuPencil size={14} />,
                  onClick: (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
                    info.domEvent.stopPropagation();
                    setOpenDropdownKey(null);
                    onRenameFile(record.data as ResourceItem);
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
                    onDeleteFile(record.data as ResourceItem);
                  },
                },
              ];
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
}
