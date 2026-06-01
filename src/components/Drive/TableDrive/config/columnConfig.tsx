import EntryIcon from '@/components/Common/EntryIcon';
import IconText from '@/components/Common/IconText';
import type { MenuProps } from 'antd';
import { Dropdown } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ReactNode } from 'react';
import { LuEllipsisVertical, LuFolderInput, LuPencil, LuShield, LuTrash2 } from 'react-icons/lu';
import type { DriveActionTarget } from '../../common/driveComponentModel';
import { isDriveActionTarget } from '../../common/driveComponentModel';
import type { DriveRow, DriveRowPredicate, TableDriveActionConfig } from '../index.type';
import type { RowActionKind } from '../useTableDriveActions';

const evaluatePredicate = (
  predicate: DriveRowPredicate | undefined,
  node: DriveActionTarget
): boolean => (typeof predicate === 'function' ? predicate(node) : Boolean(predicate));

export interface TableDriveColumnConfigOptions {
  styles: {
    nameCell: string;
    loadMoreCell: string;
    optionBtn: string;
  };
  loadingMoreParentId: string | null;
  actionConfig?: TableDriveActionConfig;
  openDropdownKey: string | null;
  setOpenDropdownKey: (key: string | null) => void;
  onRowAction: (kind: RowActionKind, node: DriveActionTarget) => void;
}

const TOTAL_COLUMNS = 4;

function renderTypeLabel(record: DriveRow): string | null {
  switch (record.type) {
    case 'folder':
      return '文件夹';
    case 'resource':
      return record.resourceType;
    case 'link':
      return '链接';
    case 'trash':
      return '回收站';
    case 'loadMore':
      return null;
  }
}

function renderRowName(record: DriveRow): string {
  switch (record.type) {
    case 'folder':
      return record.name;
    case 'resource':
    case 'link':
      return record.title;
    case 'trash':
      return '回收站';
    case 'loadMore':
      return '';
  }
}

export function getTableDriveColumns(
  options: TableDriveColumnConfigOptions
): ColumnsType<DriveRow> {
  const {
    styles,
    loadingMoreParentId,
    actionConfig,
    openDropdownKey,
    setOpenDropdownKey,
    onRowAction,
  } = options;

  return [
    {
      title: '名称',
      key: 'name',
      onHeaderCell: () => ({
        style: { paddingLeft: 'calc(8px + 20px + var(--ant-margin-xs))' },
      }),
      render: (_: unknown, record: DriveRow) => {
        // loadMore 行跨整行渲染（colSpan = 全部列数）
        if (record.type === 'loadMore') {
          const isLoadingMore = loadingMoreParentId === record.parentId;
          return {
            children: (
              <button type="button" className={styles.loadMoreCell} disabled={isLoadingMore}>
                {isLoadingMore
                  ? '加载中...'
                  : `加载更多（已加载 ${record.loaded} / 共 ${record.total}）`}
              </button>
            ),
            props: { colSpan: TOTAL_COLUMNS },
          };
        }
        const iconSize = record.type === 'folder' ? 20 : 18;
        const resourceType = record.type === 'resource' ? record.resourceType : undefined;
        return (
          <IconText
            as="div"
            className={styles.nameCell}
            icon={<EntryIcon entryType={record.type} resourceType={resourceType} size={iconSize} />}
            iconSize={iconSize}
            gap="var(--ant-margin-sm)"
            ellipsis
          >
            {renderRowName(record)}
          </IconText>
        );
      },
    },
    {
      title: '大小',
      key: 'size',
      width: 100,
      render: (_: unknown, record: DriveRow) => {
        if (record.type === 'loadMore') return { children: null, props: { colSpan: 0 } };
        return '-';
      },
    },
    {
      title: '类型',
      key: 'type',
      width: 120,
      render: (_: unknown, record: DriveRow) => {
        if (record.type === 'loadMore') return { children: null, props: { colSpan: 0 } };
        return renderTypeLabel(record);
      },
    },
    {
      title: '',
      key: 'action',
      width: 56,
      align: 'right',
      render: (_: unknown, record: DriveRow) => {
        if (record.type === 'loadMore') return { children: null, props: { colSpan: 0 } };
        if (!isDriveActionTarget(record)) return null;

        const menuActions = buildMenuItems(record, actionConfig);
        if (menuActions.length === 0) return null;
        const items: MenuProps['items'] = menuActions.map((item) => ({
          key: item.key,
          label: item.label,
          icon: item.icon,
          danger: item.danger,
        }));
        return (
          <Dropdown
            menu={{
              items,
              onClick: (info) => {
                info.domEvent.stopPropagation();
                setOpenDropdownKey(null);
                const matched = menuActions.find((item) => item.key === info.key);
                if (matched) onRowAction(matched.action, record);
              },
            }}
            trigger={['click']}
            placement="bottomRight"
            open={openDropdownKey === record.id}
            onOpenChange={(open) => setOpenDropdownKey(open ? record.id : null)}
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

interface RowMenuAction {
  key: string;
  label: string;
  icon: ReactNode;
  danger?: boolean;
  action: RowActionKind;
}

const DEFAULT_ROW_CONFIG: Required<NonNullable<TableDriveActionConfig['row']>> = {
  canRename: true,
  canDelete: true,
  canMove: true,
  canManageNodePermission: false,
};

function buildMenuItems(
  record: DriveActionTarget,
  actionConfig: TableDriveActionConfig | undefined
): RowMenuAction[] {
  const rowConfig = { ...DEFAULT_ROW_CONFIG, ...actionConfig?.row };
  const menuItems: RowMenuAction[] = [];

  if (evaluatePredicate(rowConfig.canRename, record)) {
    menuItems.push({
      key: 'rename',
      label: '重命名',
      icon: <LuPencil size={14} />,
      action: 'rename',
    });
  }
  if (evaluatePredicate(rowConfig.canMove, record)) {
    menuItems.push({
      key: 'move',
      label: '移动到文件夹',
      icon: <LuFolderInput size={14} />,
      action: 'move',
    });
  }
  if (record.type === 'folder' && evaluatePredicate(rowConfig.canManageNodePermission, record)) {
    menuItems.push({
      key: 'permission',
      label: '标签权限管理',
      icon: <LuShield size={14} />,
      action: 'permission',
    });
  }
  if (evaluatePredicate(rowConfig.canDelete, record)) {
    menuItems.push({
      key: 'delete',
      label: '删除',
      icon: <LuTrash2 size={14} />,
      danger: true,
      action: 'delete',
    });
  }

  return menuItems;
}
