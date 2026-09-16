import {
  Autocomplete,
  EmptyState,
  ListBox,
  SearchField,
  Tabs,
  Tag,
  TagGroup,
  useFilter,
} from '@heroui/react';
import { X } from 'lucide-react';
import type { Key, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import AppBanner from '@/components/base/AppBanner';
import AppModal from '@/components/base/AppModal';
import AppAvatar from '@/components/base/Avatar';
import { AppButton } from '@/components/base/Button';
import AppIconButton from '@/components/base/Button/AppIconButton';
import { Empty, Spin } from '@/components/base/Feedback';
import {
  TAG_PERMISSION_ACTION_PRESET_OPTIONS,
  type TagPermissionResourceStrategy,
} from '@/components/business/Drive/common/tagPermissionPreset';
import DriveNavigator from '@/components/business/Drive/DriveNavigator';
import TagPermissionActionEditor from '@/components/business/Drive/PermissionActionEditor';
import { ACCESS_CONTROL_SCOPE } from '@/domains/Tag';
import { parseErrorMessage } from '@/utils/error';

import type { TagMountPermissionModalProps, TagPermissionModalProps } from './index.type';
import styles from './style.module.less';
import {
  getDisplayInitial,
  isSpecifiedUserScope,
  PERSONNEL_SCOPE_OPTIONS,
  type PersonnelPolicyConfig,
  type TagPolicyModalMode,
} from './tagPermissionModalModel';
import { useTagPermissionModalController } from './useTagPermissionModalController';

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
  const { contains } = useFilter({ sensitivity: 'base' });
  const {
    groupMemberError,
    groupMemberLoading,
    handleOpenChange,
    handlePersonnelScopeChange,
    handlePersonnelUsersChange,
    handleSubmit,
    handleTagChange,
    initialTagLoading,
    memberOptions,
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

  const renderMemberPicker = (policy: PersonnelPolicyConfig) => {
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

    const selectedMembers = policy.specifiedUsers
      .map((userId) => memberOptions.find((member) => member.userId === userId))
      .filter((member) => member != null);

    const renderSelectedMembers = (): ReactNode => {
      if (selectedMembers.length === 0) {
        return (
          <div className={styles.selectedMemberEmpty}>
            <Empty description={t('permission.tag.noSelectedMembers')} />
          </div>
        );
      }

      return (
        <div className={styles.selectedMemberList}>
          {selectedMembers.map((member) => (
            <div key={member.userId} className={styles.selectedMemberItem}>
              <AppAvatar aria-label={member.name} className={styles.selectedMemberAvatar}>
                {member.avatar ? <AppAvatar.Image alt={member.name} src={member.avatar} /> : null}
                <AppAvatar.Fallback>{getDisplayInitial(member.name)}</AppAvatar.Fallback>
              </AppAvatar>
              <div className={styles.selectedMemberMeta}>
                <span className={styles.selectedMemberName}>{member.name}</span>
                <span className={styles.selectedMemberDescription}>{member.description}</span>
              </div>
              <AppIconButton
                icon={<X size={14} aria-hidden="true" />}
                label={t('permission.tag.removeSelectedMember', { name: member.name })}
                size="sm"
                variant="ghost"
                onPress={() =>
                  handlePersonnelUsersChange(
                    policy.target,
                    policy.specifiedUsers.filter((userId) => userId !== member.userId)
                  )
                }
              />
            </div>
          ))}
        </div>
      );
    };

    const handleRemoveTags = (keys: Set<Key>) => {
      const removedUserIds = new Set([...keys].map(String));
      handlePersonnelUsersChange(
        policy.target,
        policy.specifiedUsers.filter((userId) => !removedUserIds.has(userId))
      );
    };

    return (
      <>
        <Autocomplete
          className={styles.memberPicker}
          placeholder={t('permission.tag.selectPlaceholder')}
          selectionMode="multiple"
          value={policy.specifiedUsers}
          onChange={(keys) => handlePersonnelUsersChange(policy.target, keys)}
        >
          <Autocomplete.Trigger className={styles.memberPickerTrigger}>
            <Autocomplete.Value>
              {({ defaultChildren, isPlaceholder }) => {
                if (isPlaceholder || selectedMembers.length === 0) {
                  return <span className={styles.memberPickerPlaceholder}>{defaultChildren}</span>;
                }

                return (
                  <TagGroup size="sm" onRemove={handleRemoveTags}>
                    <TagGroup.List className={styles.selectedTags}>
                      {selectedMembers.map((member) => (
                        <Tag key={member.userId} id={member.userId} className={styles.selectedTag}>
                          <AppAvatar aria-label={member.name} className={styles.selectedTagAvatar}>
                            {member.avatar ? (
                              <AppAvatar.Image alt={member.name} src={member.avatar} />
                            ) : null}
                            <AppAvatar.Fallback>
                              {getDisplayInitial(member.name)}
                            </AppAvatar.Fallback>
                          </AppAvatar>
                          <span className={styles.selectedTagName}>{member.name}</span>
                        </Tag>
                      ))}
                    </TagGroup.List>
                  </TagGroup>
                );
              }}
            </Autocomplete.Value>
            <Autocomplete.ClearButton />
            <Autocomplete.Indicator />
          </Autocomplete.Trigger>
          <Autocomplete.Popover className={styles.memberPickerPopover}>
            <Autocomplete.Filter filter={contains}>
              <SearchField autoFocus name={`${policy.target}MemberSearch`} variant="secondary">
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder={t('permission.tag.searchPlaceholder')} />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>
              <ListBox
                className={styles.memberList}
                aria-label={t('permission.tag.memberListAria', { title: policy.title })}
                renderEmptyState={() => (
                  <EmptyState>{t('permission.tag.noMatchingMembers')}</EmptyState>
                )}
              >
                {memberOptions.map((member) => (
                  <ListBox.Item
                    key={member.userId}
                    id={member.userId}
                    textValue={`${member.name} ${member.description} ${member.userId}`}
                    className={styles.memberListItem}
                  >
                    <span className={styles.memberItem}>
                      <AppAvatar aria-label={member.name} className={styles.memberAvatar}>
                        {member.avatar ? (
                          <AppAvatar.Image alt={member.name} src={member.avatar} />
                        ) : null}
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
            </Autocomplete.Filter>
          </Autocomplete.Popover>
        </Autocomplete>
        <div className={styles.selectedMemberPanel}>
          <div className={styles.selectedMemberHeader}>
            <div className={styles.selectedMemberTitle}>{t('permission.tag.selectedMembers')}</div>
            <div className={styles.personnelCount}>
              {t('permission.tag.selectedCount', { count: selectedMembers.length })}
            </div>
          </div>
          {renderSelectedMembers()}
        </div>
      </>
    );
  };

  const renderPersonnelPolicy = (policy: PersonnelPolicyConfig) => {
    const shouldShowMemberPicker = isSpecifiedUserScope(policy.scope);
    const scopeHint =
      policy.scope === ACCESS_CONTROL_SCOPE.WHITELIST
        ? t('permission.tag.whitelistHint')
        : policy.scope === ACCESS_CONTROL_SCOPE.BLACKLIST
          ? t('permission.tag.blacklistHint')
          : null;

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
        {scopeHint ? (
          <AppBanner status="accent" className={styles.scopeHintBanner} description={scopeHint} />
        ) : null}
        {shouldShowMemberPicker ? (
          renderMemberPicker(policy)
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
          <AppButton
            variant="secondary"
            isDisabled={saving}
            onPress={() => handleOpenChange(false)}
          >
            {t('actions.cancel', { ns: 'common' })}
          </AppButton>
          <AppButton
            variant="primary"
            isDisabled={saving || !selectedTag || !groupId}
            aria-busy={saving || undefined}
            onPress={handleSubmit}
          >
            {t('actions.save', { ns: 'common' })}
          </AppButton>
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
