import { DataTable, type DataTableColumn } from '@/components/Table';
import type { AdminUser } from '@/domains/Admin';
import { IDENTITY, USER_STATUS } from '@/domains/User/enum';
import { Chip, ListBox, Select } from '@heroui/react';
import { useCallback, useMemo, type ReactNode } from 'react';
import type { AdminUserTableProps } from './index.type';
import styles from './style.module.less';

const EMPTY_TEXT = '-';
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const formatOptionalText = (value?: string): string => {
  return value && value.trim() ? value : EMPTY_TEXT;
};

const getDisplayName = (user: AdminUser): string => {
  return user.realName || user.nickname || user.username || EMPTY_TEXT;
};

function AdminUserTable({
  users,
  loading = false,
  total,
  currentPage,
  pageSize,
  onPageChange,
  onRowClick,
}: AdminUserTableProps) {
  const renderRowButton = useCallback(
    (record: AdminUser, children: ReactNode) => (
      <button
        type="button"
        className={styles.cellButton}
        onClick={() => onRowClick(record.id)}
        aria-label={`查看用户 ${getDisplayName(record)}`}
      >
        {children}
      </button>
    ),
    [onRowClick]
  );

  const columns = useMemo<DataTableColumn<AdminUser>[]>(
    () => [
      {
        id: 'user',
        label: '用户',
        width: 'lg',
        isRowHeader: true,
        renderCell: (record) =>
          renderRowButton(
            record,
            <DataTable.MemberCell
              name={getDisplayName(record)}
              subline={formatOptionalText(record.nickname)}
              avatarSrc={record.avatar}
            />
          ),
      },
      {
        id: 'username',
        label: '用户名',
        width: 'md',
        renderCell: (record) =>
          renderRowButton(
            record,
            <DataTable.TextCell>{formatOptionalText(record.username)}</DataTable.TextCell>
          ),
      },
      {
        id: 'campusNo',
        label: '学工号',
        width: 'md',
        renderCell: (record) =>
          renderRowButton(
            record,
            <DataTable.TextCell>{formatOptionalText(record.campusNo)}</DataTable.TextCell>
          ),
      },
      {
        id: 'identityType',
        label: '身份',
        width: 'sm',
        renderCell: (record) =>
          renderRowButton(
            record,
            <Chip size="sm" variant="soft">
              <Chip.Label>{IDENTITY.getLabel(record.identityType) || EMPTY_TEXT}</Chip.Label>
            </Chip>
          ),
      },
      {
        id: 'status',
        label: '状态',
        width: 'sm',
        renderCell: (record) => {
          const statusClassName =
            record.status === 1
              ? styles.statusSuccess
              : record.status === -2
                ? styles.statusDanger
                : styles.statusWarning;
          return renderRowButton(
            record,
            <Chip size="sm" variant="soft" className={statusClassName}>
              <Chip.Label>{USER_STATUS.getLabel(record.status) || EMPTY_TEXT}</Chip.Label>
            </Chip>
          );
        },
      },
      {
        id: 'email',
        label: '邮箱',
        width: 'lg',
        renderCell: (record) =>
          renderRowButton(
            record,
            <DataTable.TextCell>{formatOptionalText(record.email)}</DataTable.TextCell>
          ),
      },
      {
        id: 'createTime',
        label: '创建时间',
        width: 'lg',
        renderCell: (record) =>
          renderRowButton(
            record,
            <DataTable.TextCell>{formatOptionalText(record.createTime)}</DataTable.TextCell>
          ),
      },
    ],
    [renderRowButton]
  );

  return (
    <div className={styles.tableWrapper}>
      <DataTable<AdminUser>
        ariaLabel="用户列表"
        rowKey="id"
        items={users}
        loading={loading}
        columns={columns}
        emptyText="暂无用户"
        getRowClassName={() => styles.clickableRow}
        pagination={{
          total,
          current: currentPage,
          pageSize,
          summary: `共 ${total} 条`,
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
                    <ListBox.Item key={String(size)} id={String(size)} textValue={`${size} 条/页`}>
                      {size} 条/页
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          ),
        }}
        maxBodyHeight={520}
      />
    </div>
  );
}

export default AdminUserTable;
