import { useGroupService, useQuotaService } from '@/domains';
import type { GroupMember } from '@/domains/Group';
import { ROLE } from '@/domains/Group';
import type { EnumKey } from '@/utils/enum';
import { parseErrorMessage } from '@/utils/error';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { Button, toast, type Selection, type SortDescriptor } from '@heroui/react';
import { usePagination } from 'ahooks';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MemberListProps } from './index.type';
import MemberListTable from './MemberListTable';
import type { MemberListInlineDraft, MemberListInlineEditKind } from './MemberListTable/index.type';
import {
  AssignQuotaModal,
  DeleteMemberModal,
  EditPermissionModal,
  InviteUserModal,
} from './Modals';
import styles from './style.module.less';

const GROUP_MEMBER_TOKEN_LIMIT_MAX = 100_000_000;
const EMPTY_MEMBERS: GroupMember[] = [];

function MemberList({ groupDisplayConfig, pagination, groupId, inviteCode }: MemberListProps) {
  const { i18n, t } = useTranslation(['group', 'common']);
  const locale = i18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN';
  const groupService = useGroupService();
  const quotaService = useQuotaService();
  const selectedMembersMapRef = useRef<Map<string, GroupMember>>(new Map());
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);
  const [selectedMembersList, setSelectedMembersList] = useState<GroupMember[]>([]);
  const [singleDeleteMember, setSingleDeleteMember] = useState<GroupMember | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingKind, setEditingKind] = useState<MemberListInlineEditKind | null>(null);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [errorRowId, setErrorRowId] = useState<string | null>(null);
  const [inlineErrorMessage, setInlineErrorMessage] = useState<string | null>(null);
  const [inlineDraft, setInlineDraft] = useState<MemberListInlineDraft>({});
  const [activeModal, setActiveModal] = useState<
    'invite' | 'editPermission' | 'deleteMember' | 'assignQuota' | null
  >(null);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor | undefined>();

  const defaultPageSize = pagination?.defaultPageSize ?? 5;
  const {
    data: membersData,
    loading,
    refresh,
    pagination: { current: currentPage = 1, pageSize = defaultPageSize, onChange: onPageChange },
  } = usePagination(
    async ({ current, pageSize: nextPageSize }) => {
      const { members, total } = await groupService.fetchGroupMembers(
        groupId,
        current,
        nextPageSize
      );
      return { list: members, total };
    },
    {
      defaultCurrent: 1,
      defaultPageSize,
      refreshDeps: [groupId],
      onError: () => {
        toast.danger(t('member.loadFailed'));
      },
    }
  );

  const members = membersData?.list ?? EMPTY_MEMBERS;
  const total = membersData?.total ?? 0;

  const clearSelectedMembers = () => {
    setSelectedRowKeys([]);
    setSelectedMembersList([]);
    selectedMembersMapRef.current.clear();
  };

  const exitBatchEditMode = () => {
    setBatchEditMode(false);
    clearSelectedMembers();
  };

  const enterBatchEditMode = () => {
    clearInlineEdit();
    setBatchEditMode(true);
  };

  const clearInlineEdit = () => {
    setEditingRowId(null);
    setEditingKind(null);
    setSavingRowId(null);
    setErrorRowId(null);
    setInlineErrorMessage(null);
    setInlineDraft({});
  };

  const onCancelModal = () => {
    setActiveModal(null);
    setSingleDeleteMember(null);
  };

  const onSuccessModal = () => {
    setActiveModal(null);
    setSingleDeleteMember(null);
    clearSelectedMembers();
    clearInlineEdit();
    setBatchEditMode(false);
    void refresh();
  };

  const handleSelectionChange = (keys: Selection, currentPageMembers: GroupMember[]) => {
    const currentPageKeySet = new Set(currentPageMembers.map((member) => String(member.userId)));
    const currentPageSelectedKeySet =
      keys === 'all' ? currentPageKeySet : new Set(Array.from(keys).map((key) => String(key)));
    const otherPageKeys = selectedRowKeys.filter((key) => !currentPageKeySet.has(String(key)));
    const finalKeys = [...otherPageKeys, ...Array.from(currentPageSelectedKeySet)];

    currentPageMembers.forEach((member) => {
      const idKey = String(member.userId);
      if (currentPageSelectedKeySet.has(idKey)) {
        selectedMembersMapRef.current.set(idKey, member);
      } else {
        selectedMembersMapRef.current.delete(idKey);
      }
    });

    const finalKeySet = new Set(finalKeys.map((key) => String(key)));
    Array.from(selectedMembersMapRef.current.keys()).forEach((key) => {
      if (!finalKeySet.has(key)) {
        selectedMembersMapRef.current.delete(key);
      }
    });

    setSelectedRowKeys(finalKeys);
    setSelectedMembersList(
      finalKeys
        .map((key) => selectedMembersMapRef.current.get(String(key)))
        .filter((member): member is GroupMember => member !== undefined)
    );
  };

  const handleStartInlineEdit = (member: GroupMember, kind: MemberListInlineEditKind) => {
    setEditingRowId(String(member.userId));
    setEditingKind(kind);
    setSavingRowId(null);
    setErrorRowId(null);
    setInlineErrorMessage(null);
    setInlineDraft(
      kind === 'role'
        ? { role: member.role }
        : { quota: String(member.limit ?? Math.max(1, member.used ?? 0)) }
    );
  };

  const validateQuotaDraft = (member: GroupMember): number | null => {
    const rawValue = inlineDraft.quota?.trim();
    const value = Number(rawValue);
    const min = Math.max(1, member.used ?? 0);

    if (!rawValue || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
      toast.warning(t('member.feedback.invalidIntegerQuota'));
      return null;
    }
    if (value > GROUP_MEMBER_TOKEN_LIMIT_MAX) {
      toast.warning(
        t('member.feedback.quotaOverLimit', {
          limit: GROUP_MEMBER_TOKEN_LIMIT_MAX.toLocaleString(locale),
        })
      );
      return null;
    }
    if (value < min) {
      toast.warning(t('member.feedback.quotaBelowUsage', { used: min.toLocaleString(locale) }));
      return null;
    }
    return value;
  };

  const handleInlineSave = async (member: GroupMember) => {
    if (!editingKind) {
      return;
    }

    const rowId = String(member.userId);
    setSavingRowId(rowId);
    setErrorRowId(null);
    setInlineErrorMessage(null);

    try {
      if (editingKind === 'role') {
        const nextRole = (inlineDraft.role ?? member.role) as EnumKey<typeof ROLE>;
        await groupService.updateMemberRole({
          groupId,
          targetUserIds: [member.userId],
          role: ROLE[nextRole] ?? ROLE.MEMBER,
        });
        toast.success(t('member.feedback.permissionUpdated'));
      } else {
        const quota = validateQuotaDraft(member);
        if (quota == null) {
          setSavingRowId(null);
          return;
        }
        await quotaService.setGroupQuota({
          groupId,
          targetUserIds: [member.userId],
          newTokenLimit: quota,
        });
        toast.success(t('member.feedback.quotaAssigned'));
      }

      clearInlineEdit();
      void refresh();
    } catch (err) {
      setSavingRowId(null);
      setErrorRowId(rowId);
      setInlineErrorMessage(parseErrorMessage(err));
      toast.danger(parseErrorMessage(err));
    }
  };

  const handleDeleteSingleMember = (member: GroupMember) => {
    setSingleDeleteMember(member);
    setActiveModal('deleteMember');
  };

  const selectedMemberIds = selectedRowKeys.map((k) => normalizeId(k));

  const activeDeleteMembers = singleDeleteMember ? [singleDeleteMember] : selectedMembersList;
  const activeDeleteMemberIds = singleDeleteMember
    ? [singleDeleteMember.userId]
    : selectedMemberIds;
  const currentPageSelectedKeys = (() => {
    const currentPageKeys = new Set(members.map((member) => String(member.userId)));
    return new Set(selectedRowKeys.filter((key) => currentPageKeys.has(String(key))).map(String));
  })();

  const showBatchActions = groupDisplayConfig.canEnterEditMode;
  const hasBatchActions =
    showBatchActions &&
    (groupDisplayConfig.canModifyPermission ||
      groupDisplayConfig.canAssignQuota ||
      groupDisplayConfig.canRemoveMember);

  const toolbar =
    !hasBatchActions && !groupDisplayConfig.canInviteMember ? null : (
      <div className={styles.toolbarActions}>
        {batchEditMode && showBatchActions && groupDisplayConfig.canModifyPermission ? (
          <Button
            onPress={() => setActiveModal('editPermission')}
            isDisabled={selectedRowKeys.length === 0}
          >
            {t('member.actions.editPermission')}
          </Button>
        ) : null}
        {batchEditMode && showBatchActions && groupDisplayConfig.canAssignQuota ? (
          <Button
            onPress={() => setActiveModal('assignQuota')}
            isDisabled={selectedRowKeys.length === 0}
          >
            {t('member.actions.assignQuota')}
          </Button>
        ) : null}
        {batchEditMode && showBatchActions && groupDisplayConfig.canRemoveMember ? (
          <Button
            variant="danger"
            onPress={() => setActiveModal('deleteMember')}
            isDisabled={selectedRowKeys.length === 0}
          >
            {t('member.actions.delete')}
          </Button>
        ) : null}
        {batchEditMode && hasBatchActions ? (
          <Button variant="ghost" onPress={exitBatchEditMode}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
        ) : null}
        {!batchEditMode && hasBatchActions ? (
          <Button onPress={enterBatchEditMode}>{t('member.actions.batchEdit')}</Button>
        ) : null}
        {groupDisplayConfig.canInviteMember ? (
          <Button variant="primary" onPress={() => setActiveModal('invite')}>
            {t('member.actions.invite')}
          </Button>
        ) : null}
      </div>
    );

  return (
    <div>
      <MemberListTable
        groupDisplayConfig={groupDisplayConfig}
        pagination={pagination}
        members={members}
        loading={loading}
        total={total}
        currentPage={currentPage}
        pageSize={pageSize}
        selectedKeys={currentPageSelectedKeys}
        editingRowId={editingRowId}
        editingKind={editingKind}
        savingRowId={savingRowId}
        errorRowId={errorRowId}
        errorMessage={inlineErrorMessage}
        inlineDraft={inlineDraft}
        onPageChange={onPageChange}
        onSelectionChange={handleSelectionChange}
        onStartInlineEdit={handleStartInlineEdit}
        onInlineDraftChange={setInlineDraft}
        onInlineSave={handleInlineSave}
        onInlineCancel={clearInlineEdit}
        onDismissInlineError={() => {
          setErrorRowId(null);
          setInlineErrorMessage(null);
        }}
        onDeleteMember={handleDeleteSingleMember}
        toolbar={toolbar}
        batchEditMode={batchEditMode}
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
      />

      <InviteUserModal
        isOpen={activeModal === 'invite'}
        onOpenChange={(open) => !open && onCancelModal()}
        inviteCode={inviteCode}
      />

      <EditPermissionModal
        isOpen={activeModal === 'editPermission'}
        onOpenChange={(open) => !open && onCancelModal()}
        groupId={groupId}
        memberIds={selectedMemberIds}
        members={selectedMembersList}
        groupDisplayConfig={groupDisplayConfig}
        onSuccess={onSuccessModal}
      />

      <DeleteMemberModal
        isOpen={activeModal === 'deleteMember'}
        onOpenChange={(open) => !open && onCancelModal()}
        memberIds={activeDeleteMemberIds}
        members={activeDeleteMembers}
        onSuccess={onSuccessModal}
        groupId={groupId}
        groupDisplayConfig={groupDisplayConfig}
      />

      <AssignQuotaModal
        isOpen={activeModal === 'assignQuota'}
        onOpenChange={(open) => !open && onCancelModal()}
        groupId={groupId}
        memberIds={selectedMemberIds}
        members={selectedMembersList}
        groupDisplayConfig={groupDisplayConfig}
        onSuccess={onSuccessModal}
      />
    </div>
  );
}

export default MemberList;
