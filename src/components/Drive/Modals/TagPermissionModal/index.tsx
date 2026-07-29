import AppAvatar from '@/components/Avatar';
import {
  TAG_PERMISSION_ACTION_PRESET_OPTIONS,
  type TagPermissionResourceStrategy,
} from '@/components/Drive/common/tagPermissionPreset';
import DriveNavigator from '@/components/Drive/DriveNavigator';
import TagPermissionActionEditor from '@/components/Drive/PermissionActionEditor';
import { Empty, Spin } from '@/components/Feedback';
import { Input } from '@/components/Input';
import AppModal from '@/components/Overlay/AppModal';
import { parseErrorMessage } from '@/utils/error';
import { Button, ListBox, Tabs, TextField } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import type { TagMountPermissionModalProps, TagPermissionModalProps } from './index.type';
import {
  filterMemberOptions,
  getDisplayInitial,
  isSpecifiedUserScope,
  PERSONNEL_SCOPE_OPTIONS,
  type PersonnelPolicyConfig,
  type TagPolicyModalMode,
} from './tagPermissionModalModel';
import { useTagPermissionModalController } from './useTagPermissionModalController';
import styles from './style.module.less';

interface TagPolicyModalBaseProps extends TagPermissionModalProps {
  mode: TagPolicyModalMode;
}

const TagPolicyModalBase = ({
  isOpen,
  groupId,
  initialTagId,
  mode,
  onOpenChange,
  onSuccess,
}: TagPolicyModalBaseProps) => {
  const { t } = useTranslation(['resource', 'common']);
  const {
    accessMemberSearchValue,
    groupMemberError,
    groupMemberLoading,
    handleOpenChange,
    handlePersonnelSearchChange,
    handlePersonnelScopeChange,
    handlePersonnelUsersChange,
    handleSubmit,
    handleTagChange,
    initialTagLoading,
    memberOptions,
    mountMemberSearchValue,
    permissionForm,
    saving,
    selectedTag,
    setGrantedActions,
    showTagTree,
    tagRefreshSeed,
  } = useTagPermissionModalController({
    isOpen,
    groupId,
    initialTagId,
    mode,
    onOpenChange,
    onSuccess,
    t,
  });

  const renderMemberList = (policy: PersonnelPolicyConfig) => {
    if (groupMemberLoading) {
      return (
        <div className={styles.memberState}>
          <Spin size="large" tip={t('permission.tag.loadingMembers')} />
        </div>
      );
    }

    if (groupMemberError) {
      return <div className={styles.memberState}>{parseErrorMessage(groupMemberError)}</div>;
    }

    if (memberOptions.length === 0) {
      return (
        <div className={styles.memberState}>
          <Empty description={t('permission.tag.noMembers')} />
        </div>
      );
    }

    const visibleMemberOptions = filterMemberOptions(memberOptions, policy.searchValue);
    if (visibleMemberOptions.length === 0) {
      return (
        <div className={styles.memberState}>
          <Empty description={t('permission.tag.noMatchingMembers')} />
        </div>
      );
    }

    const visibleMemberIds = new Set(visibleMemberOptions.map((member) => member.userId));
    const visibleSelectedUserIds = policy.specifiedUsers.filter((userId) =>
      visibleMemberIds.has(userId)
    );

    return (
      <ListBox
        aria-label={t('permission.tag.memberListAria', { title: policy.title })}
        selectionMode="multiple"
        selectedKeys={new Set(visibleSelectedUserIds)}
        onSelectionChange={(keys) =>
          handlePersonnelUsersChange(
            policy.target,
            keys,
            visibleMemberOptions,
            policy.specifiedUsers
          )
        }
        className={styles.memberList}
      >
        {visibleMemberOptions.map((member) => (
          <ListBox.Item key={member.userId} id={member.userId} textValue={member.name}>
            <span className={styles.memberItem}>
              <AppAvatar aria-label={member.name} className={styles.memberAvatar}>
                {member.avatar ? <AppAvatar.Image alt={member.name} src={member.avatar} /> : null}
                <AppAvatar.Fallback>{getDisplayInitial(member.name)}</AppAvatar.Fallback>
              </AppAvatar>
              <span className={styles.memberMeta}>
                <span className={styles.memberName}>{member.name}</span>
                <span className={styles.memberDescription}>{member.description}</span>
              </span>
            </span>
            <ListBox.ItemIndicator />
          </ListBox.Item>
        ))}
      </ListBox>
    );
  };

  const renderPersonnelPolicy = (policy: PersonnelPolicyConfig) => {
    const shouldShowMemberPicker = isSpecifiedUserScope(policy.scope);

    return (
      <section key={policy.target} className={styles.personnelCard} aria-label={policy.title}>
        <div className={styles.personnelHeader}>
          <div className={styles.personnelTitle}>{policy.title}</div>
          {shouldShowMemberPicker ? (
            <div className={styles.personnelCount}>
              {t('permission.tag.selectedCount', { count: policy.specifiedUsers.length })}
            </div>
          ) : null}
        </div>
        <Tabs
          className={styles.scopeTabs}
          selectedKey={String(policy.scope)}
          onSelectionChange={(key) => handlePersonnelScopeChange(policy.target, key)}
        >
          <Tabs.ListContainer className={styles.scopeTabsListContainer}>
            <Tabs.List
              className={styles.scopeTabsList}
              aria-label={t('permission.tag.rangeAria', { title: policy.title })}
            >
              {PERSONNEL_SCOPE_OPTIONS.map((option) => (
                <Tabs.Tab
                  key={String(option.scope)}
                  id={String(option.scope)}
                  className={styles.scopeTab}
                >
                  {t(option.labelKey)}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
        {shouldShowMemberPicker ? (
          <>
            <TextField
              aria-label={t('permission.tag.searchAria', { title: policy.title })}
              value={policy.searchValue}
              onChange={(value) => handlePersonnelSearchChange(policy.target, value)}
            >
              <Input
                placeholder={t('permission.tag.searchPlaceholder')}
                className={styles.memberSearchInput}
              />
            </TextField>
            {renderMemberList(policy)}
          </>
        ) : (
          <div className={styles.memberState}>{t('permission.tag.noListNeeded')}</div>
        )}
      </section>
    );
  };

  const renderPermissionPanel = () => (
    <TagPermissionActionEditor
      ariaLabel={t('permission.editor.actionsAria')}
      actions={permissionForm.grantedActions}
      labels={{
        actionHeader: t('permission.tag.actionHeader'),
        applicable: (strategy: TagPermissionResourceStrategy) =>
          t('permission.tag.applicable', { strategy: strategy.label }),
        basedOnPreset: t('permission.tag.basedOnPreset'),
        currentPreset: (preset) => t('permission.tag.currentPreset', { preset }),
        customPreset: t('permission.tag.preset.custom.label'),
        disabled: (strategy, action) =>
          t('permission.tag.disabledAria', { strategy: strategy.label, action }),
        enabled: (strategy, action) =>
          t('permission.tag.enabledAria', { strategy: strategy.label, action }),
        getActionLabel: (action) => action.label,
        getPresetLabel: (preset) =>
          TAG_PERMISSION_ACTION_PRESET_OPTIONS.find((item) => item.key === preset)?.label ?? preset,
        toggleHeader: t('permission.tag.toggleHeader'),
      }}
      onActionsChange={setGrantedActions}
    />
  );

  const renderAccessPolicyPanel = () => {
    const accessPolicy: PersonnelPolicyConfig = {
      target: 'resourceGrant',
      title: t('permission.tag.accessList'),
      scope: permissionForm.taggedResourceAclGrantScope,
      specifiedUsers: permissionForm.taggedResourceAclGrantSpecifiedUsers,
      searchValue: accessMemberSearchValue,
    };

    return (
      <div className={styles.advancedAccessGrid}>
        {renderPersonnelPolicy(accessPolicy)}
        {renderPermissionPanel()}
      </div>
    );
  };

  const renderMountPolicyPanel = () => {
    const mountPolicy: PersonnelPolicyConfig = {
      target: 'tagMount',
      title: t('permission.tag.mountList'),
      scope: permissionForm.tagMountPermissionScope,
      specifiedUsers: permissionForm.tagMountSpecifiedUsers,
      searchValue: mountMemberSearchValue,
    };

    return <div className={styles.advancedMountGrid}>{renderPersonnelPolicy(mountPolicy)}</div>;
  };

  const renderAdvancedPolicyPanel = () =>
    mode === 'access' ? renderAccessPolicyPanel() : renderMountPolicyPanel();

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={mode === 'access' ? t('permission.tag.accessTitle') : t('permission.tag.mountTitle')}
      size="lg"
      containerClassName={mode === 'mount' ? styles.mountModalContainer : styles.modalContainer}
      dialogClassName={mode === 'mount' ? styles.mountModalDialog : styles.modalDialog}
      isDismissable={!saving}
      actions={
        <>
          <Button variant="secondary" isDisabled={saving} onPress={() => handleOpenChange(false)}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button
            variant="primary"
            isDisabled={saving || !selectedTag || !groupId}
            aria-busy={saving || undefined}
            onPress={handleSubmit}
          >
            {t('actions.save', { ns: 'common' })}
          </Button>
        </>
      }
    >
      <div className={styles.modalFormPadding}>
        <div className={styles.wrapper}>
          {showTagTree ? (
            <div className={styles.leftPane}>
              <div className={styles.leftTitle}>{t('permission.tag.selectTag')}</div>
              <DriveNavigator
                scope={groupId ? { type: 'group', groupId } : undefined}
                selectableTypes={['folder']}
                multiple={false}
                refreshTrigger={tagRefreshSeed}
                disabled={saving}
                onChange={handleTagChange}
              />
            </div>
          ) : null}

          <div className={styles.rightPane}>
            {!selectedTag ? (
              <div className={styles.emptyState}>
                {showTagTree ? (
                  <Empty description={t('permission.tag.selectTagHint')} />
                ) : (
                  <Spin size="large" tip={t('permission.tag.loadingTagPermission')} />
                )}
              </div>
            ) : (
              <>
                {initialTagLoading ? (
                  <div className={styles.emptyState}>
                    <Spin size="large" tip={t('permission.tag.loadingTagPermission')} />
                  </div>
                ) : (
                  renderAdvancedPolicyPanel()
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppModal>
  );
};

const TagPermissionModal = (props: TagPermissionModalProps) => (
  <TagPolicyModalBase {...props} mode="access" />
);

export const TagMountPermissionModal = (props: TagMountPermissionModalProps) => (
  <TagPolicyModalBase {...props} mode="mount" />
);

export default TagPermissionModal;
