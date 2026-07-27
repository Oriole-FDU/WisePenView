import { Input, Select } from '@/components/Input';
import QuotaBar from '@/components/QuotaBar';
import {
  DataTable,
  ManageTable,
  type DataTableColumn,
  type ManageTableColumn,
} from '@/components/Table';
import type { GroupMember } from '@/domains/Group';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import { Label, ListBox, TextField } from '@heroui/react';
import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { canEditSelectedMembers, canEditSelectedMembersForQuota } from '../../GroupDisplayConfig';
import type {
  MemberListInlineDraft,
  MemberListPaginationConfig,
  MemberListTableProps,
} from './index.type';
import styles from './style.module.less';

type MemberRecord = GroupMember & { key: string };
type ReadonlyColumn = DataTableColumn<MemberRecord>;
type EditableColumn = ManageTableColumn<MemberRecord>;

const EMPTY_TEXT = '-';
const GROUP_MEMBER_TOKEN_LIMIT_MAX = 100_000_000;

function getDisplayName(member: GroupMember): string {
  return member.nickname?.trim() || member.realname?.trim() || '?';
}

function getMemberSubline(member: GroupMember, showRealName: boolean): string | undefined {
  if (!showRealName) {
    return undefined;
  }
  const realname = member.realname?.trim();
  if (!realname || realname === getDisplayName(member)) {
    return undefined;
  }
  return realname;
}

function getRoleClassName(role: GroupMember['role']): string {
  switch (role) {
    case 'OWNER':
      return styles.roleOwner;
    case 'ADMIN':
      return styles.roleAdmin;
    case 'MEMBER':
    default:
      return styles.roleMember;
  }
}

function canEditRole(member: GroupMember, props: MemberListTableProps): boolean {
  return (
    props.groupDisplayConfig.canModifyPermission &&
    canEditSelectedMembers([member], props.groupDisplayConfig.editableRoles)
  );
}

function canEditQuota(member: GroupMember, props: MemberListTableProps): boolean {
  return (
    props.groupDisplayConfig.canAssignQuota &&
    props.groupDisplayConfig.showQuotas &&
    canEditSelectedMembersForQuota([member], props.groupDisplayConfig.editableRolesForQuota)
  );
}

function canRemoveMember(member: GroupMember, props: MemberListTableProps): boolean {
  return (
    props.groupDisplayConfig.canRemoveMember &&
    canEditSelectedMembers([member], props.groupDisplayConfig.editableRoles)
  );
}

function buildPageSizeControl(
  config: Required<MemberListPaginationConfig>,
  pageSize: number,
  onPageChange: (page: number, size: number) => void,
  t: TFunction<'group'>
): ReactNode {
  if (!config.showSizeChanger) {
    return null;
  }

  return (
    <Select
      aria-label={t('member.table.pageSizeAria')}
      value={String(pageSize)}
      onChange={(value) => {
        if (value == null || Array.isArray(value)) {
          return;
        }
        onPageChange(1, Number(value));
      }}
      className={styles.pageSizeSelect}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {config.pageSizeOptions.map((value) => (
            <ListBox.Item
              key={String(value)}
              id={String(value)}
              textValue={t('member.table.pageSize', { count: value })}
            >
              {t('member.table.pageSize', { count: value })}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function renderRole(role: GroupMember['role'], t: TFunction<'group'>) {
  const roleLabel =
    role === 'OWNER'
      ? t('member.role.owner')
      : role === 'ADMIN'
        ? t('member.role.admin')
        : t('member.role.member');
  return <span className={`${styles.roleBadge} ${getRoleClassName(role)}`}>{roleLabel}</span>;
}

function renderQuota(member: GroupMember) {
  return (
    <div className={styles.quotaItem}>
      <QuotaBar used={member.used ?? 0} limit={member.limit ?? 0} />
    </div>
  );
}

function renderRoleEditor(
  member: GroupMember,
  inlineDraft: MemberListInlineDraft,
  onInlineDraftChange: (draft: MemberListInlineDraft) => void,
  canPromoteToAdmin: boolean,
  t: TFunction<'group'>
) {
  const value = inlineDraft.role ?? member.role;

  return (
    <Select
      aria-label={t('member.table.roleAria')}
      value={value}
      onChange={(nextValue) => {
        if (nextValue == null || Array.isArray(nextValue)) {
          return;
        }
        onInlineDraftChange({ role: nextValue as GroupMember['role'] });
      }}
      className={styles.inlineSelect}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {canPromoteToAdmin ? (
            <ListBox.Item key="ADMIN" id="ADMIN" textValue={t('member.role.admin')}>
              {t('member.role.admin')}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ) : null}
          <ListBox.Item key="MEMBER" id="MEMBER" textValue={t('member.role.member')}>
            {t('member.role.member')}
            <ListBox.ItemIndicator />
          </ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function renderQuotaEditor(
  member: GroupMember,
  inlineDraft: MemberListInlineDraft,
  onInlineDraftChange: (draft: MemberListInlineDraft) => void,
  t: TFunction<'group'>
) {
  const min = Math.max(1, member.used ?? 0);
  const value = inlineDraft.quota ?? String(member.limit ?? min);

  return (
    <TextField
      aria-label={t('member.table.quotaAria')}
      value={value}
      onChange={(nextValue) => onInlineDraftChange({ quota: nextValue })}
      className={styles.inlineNumberField}
    >
      <Label className={styles.inlineFieldLabel}>{t('member.table.quotaLabel')}</Label>
      <Input
        type="number"
        min={min}
        max={GROUP_MEMBER_TOKEN_LIMIT_MAX}
        step={1}
        placeholder={t('member.table.integerPlaceholder')}
      />
    </TextField>
  );
}

function buildReadonlyColumns(
  props: MemberListTableProps,
  t: TFunction<'group'>
): ReadonlyColumn[] {
  const columns: ReadonlyColumn[] = [
    {
      id: 'member',
      label: t('member.table.columns.member'),
      width: 'lg',
      align: 'start',
      isRowHeader: true,
      allowsSorting: true,
      getSortValue: (member) => getDisplayName(member),
      renderCell: (member) => (
        <DataTable.MemberCell
          name={getDisplayName(member)}
          subline={getMemberSubline(member, props.groupDisplayConfig.showRealName)}
          avatarSrc={member.avatar?.trim() || undefined}
        />
      ),
    },
  ];

  columns.push(
    {
      id: 'role',
      label: t('member.table.columns.role'),
      width: 'sm',
      align: 'center',
      renderCell: (member) => renderRole(member.role, t),
    },
    {
      id: 'joinTime',
      label: t('member.table.columns.joinedAt'),
      width: 'md',
      align: 'start',
      allowsSorting: true,
      getSortValue: (member) => member.joinTime ?? 0,
      renderCell: (member) => (
        <DataTable.TextCell>
          {formatTimestampToDate(member.joinTime) || EMPTY_TEXT}
        </DataTable.TextCell>
      ),
    }
  );

  if (props.groupDisplayConfig.showQuotas) {
    columns.push({
      id: 'quota',
      label: t('member.table.columns.quota'),
      width: 'lg',
      align: 'center',
      renderCell: renderQuota,
    });
  }

  return columns;
}

function buildEditableColumns(
  props: MemberListTableProps,
  t: TFunction<'group'>
): EditableColumn[] {
  const readonlyColumns = buildReadonlyColumns(props, t);

  return readonlyColumns.map((column): EditableColumn => {
    if (column.id === 'member') {
      return {
        ...column,
        width: 'fill',
        renderCell: column.renderCell,
      };
    }

    if (column.id === 'role') {
      return {
        ...column,
        width: 'enum',
        renderCell: column.renderCell,
        renderEditCell: (member) =>
          props.editingKind === 'role'
            ? renderRoleEditor(
                member,
                props.inlineDraft,
                props.onInlineDraftChange,
                props.groupDisplayConfig.canModifyPermission,
                t
              )
            : column.renderCell(member, { row: member, rowId: member.key }),
      };
    }

    if (column.id === 'quota') {
      return {
        ...column,
        width: 'lg',
        renderCell: column.renderCell,
        renderEditCell: (member) =>
          props.editingKind === 'quota'
            ? renderQuotaEditor(member, props.inlineDraft, props.onInlineDraftChange, t)
            : column.renderCell(member, { row: member, rowId: member.key }),
      };
    }

    return {
      ...column,
      renderCell: column.renderCell,
    };
  });
}

function MemberListTable(props: MemberListTableProps) {
  const { t } = useTranslation('group');
  const {
    pagination,
    members,
    loading,
    total,
    currentPage,
    pageSize,
    selectedKeys,
    disabledSelectionKeys,
    editingRowId,
    savingRowId,
    errorRowId,
    errorMessage,
    onPageChange,
    onSelectionChange,
    onStartInlineEdit,
    onInlineSave,
    onInlineCancel,
    onDismissInlineError,
    onDeleteMember,
    toolbar,
    batchEditMode = false,
    sortDescriptor,
    onSortChange,
  } = props;

  const paginationConfig: Required<MemberListPaginationConfig> = {
    defaultPageSize: pagination?.defaultPageSize ?? 5,
    pageSizeOptions: pagination?.pageSizeOptions ?? [5, 10, 20, 50],
    showSizeChanger: pagination?.showSizeChanger ?? true,
  };

  const dataSource = members.map((member) => ({
    ...member,
    key: member.userId,
  })) satisfies MemberRecord[];

  const pageSizeControl = buildPageSizeControl(paginationConfig, pageSize, onPageChange, t);

  if (!props.groupDisplayConfig.canEnterEditMode) {
    return (
      <DataTable
        ariaLabel={t('member.table.listAria')}
        items={dataSource}
        rowKey="key"
        columns={buildReadonlyColumns(props, t)}
        loading={loading}
        emptyText={t('member.table.empty')}
        toolbar={toolbar}
        sortDescriptor={sortDescriptor}
        onSortChange={onSortChange}
        pagination={{
          total,
          current: currentPage,
          pageSize,
          onChange: onPageChange,
          summary: t('member.table.summary', { count: total }),
          pageSizeControl,
        }}
      />
    );
  }

  return (
    <ManageTable
      ariaLabel={t('member.table.manageAria')}
      items={dataSource}
      rowKey="key"
      columns={buildEditableColumns(props, t)}
      loading={loading}
      emptyText={t('member.table.empty')}
      toolbar={toolbar}
      sortDescriptor={sortDescriptor}
      onSortChange={onSortChange}
      batchSelection={
        batchEditMode
          ? {
              selectedKeys,
              disabledKeys: disabledSelectionKeys,
              onSelectionChange: (keys) => onSelectionChange(keys, dataSource),
            }
          : undefined
      }
      inlineEdit={{
        editingRowId,
        savingRowId,
        errorRowId,
        errorMessage,
        onDismissError: onDismissInlineError,
        onSave: onInlineSave,
        onCancel: onInlineCancel,
      }}
      rowActions={(member) => [
        {
          key: 'editRole',
          label: t('member.actions.editPermission'),
          visible: props.groupDisplayConfig.canModifyPermission,
          disabled: !canEditRole(member, props),
          onPress: () => onStartInlineEdit(member, 'role'),
        },
        {
          key: 'editQuota',
          label: t('member.actions.assignQuota'),
          visible: props.groupDisplayConfig.canAssignQuota && props.groupDisplayConfig.showQuotas,
          disabled: !canEditQuota(member, props),
          onPress: () => onStartInlineEdit(member, 'quota'),
        },
        {
          key: 'deleteMember',
          label: t('member.actions.delete'),
          variant: 'danger',
          visible: props.groupDisplayConfig.canRemoveMember,
          disabled: !canRemoveMember(member, props),
          onPress: () => onDeleteMember(member),
        },
      ]}
      pagination={{
        total,
        current: currentPage,
        pageSize,
        onChange: onPageChange,
        summary: t('member.table.summary', { count: total }),
        pageSizeControl,
      }}
    />
  );
}

export default MemberListTable;
