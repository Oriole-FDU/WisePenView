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
import { useGroupService, useTagService } from '@/domains';
import { mapTagToFolderNode } from '@/domains/Drive/mapper/DriveServices.map';
import type { GroupMember } from '@/domains/Group';
import {
  ACCESS_CONTROL_SCOPE,
  normalizeResourceActions,
  type AccessControlScope,
  type TagResourceAction,
  type TagTreeNode,
} from '@/domains/Tag';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { Button, ListBox, Tabs, TextField, toast, type Selection } from '@heroui/react';
import { useRequest } from 'ahooks';
import type { TFunction } from 'i18next';
import { useState, type Key } from 'react';
import { useTranslation } from 'react-i18next';
import {
  resolveDriveScope,
  toDriveSelectionItem,
  type DriveSelectionItem,
} from '../../common/driveComponentModel';
import type { TagMountPermissionModalProps, TagPermissionModalProps } from './index.type';
import styles from './style.module.less';

type TagPolicyModalMode = 'access' | 'mount';

type TagPermissionFormValues = {
  taggedResourceAclGrantScope: AccessControlScope;
  taggedResourceAclGrantSpecifiedUsers: string[];
  tagMountPermissionScope: AccessControlScope;
  tagMountSpecifiedUsers: string[];
  grantedActions: TagResourceAction[];
};

type PersonnelPolicyTarget = 'resourceGrant' | 'tagMount';

interface PersonnelPolicyConfig {
  target: PersonnelPolicyTarget;
  title: string;
  scope: AccessControlScope;
  specifiedUsers: string[];
  searchValue: string;
}

interface MemberOption {
  userId: string;
  name: string;
  description: string;
  avatar?: string;
}

const DEFAULT_FORM_VALUES: TagPermissionFormValues = {
  taggedResourceAclGrantScope: ACCESS_CONTROL_SCOPE.ALL,
  taggedResourceAclGrantSpecifiedUsers: [],
  tagMountPermissionScope: ACCESS_CONTROL_SCOPE.ALL,
  tagMountSpecifiedUsers: [],
  grantedActions: [],
};

const GROUP_MEMBER_PAGE_SIZE = 100;
const MAX_GROUP_MEMBER_PAGE_COUNT = 50;
const PERSONNEL_SCOPE_OPTIONS = [
  { scope: ACCESS_CONTROL_SCOPE.ALL, labelKey: 'permission.tag.scope.all' },
  { scope: ACCESS_CONTROL_SCOPE.ONLY_ADMIN, labelKey: 'permission.tag.scope.onlyAdmin' },
  { scope: ACCESS_CONTROL_SCOPE.BLACKLIST, labelKey: 'permission.tag.scope.blacklist' },
  { scope: ACCESS_CONTROL_SCOPE.WHITELIST, labelKey: 'permission.tag.scope.whitelist' },
] as const;

const isSpecifiedUserScope = (scope: AccessControlScope): boolean =>
  scope === ACCESS_CONTROL_SCOPE.WHITELIST || scope === ACCESS_CONTROL_SCOPE.BLACKLIST;

const normalizeSpecifiedUsersByScope = (scope: AccessControlScope, userIds: string[]): string[] =>
  isSpecifiedUserScope(scope) ? userIds : [];

const getDisplayInitial = (name: string): string => name.trim().charAt(0).toUpperCase() || '?';

const getMemberDisplayName = (member: GroupMember, t: TFunction<'resource'>): string =>
  member.realname?.trim() ||
  member.nickname?.trim() ||
  t('permission.tag.memberFallback', { userId: member.userId });

const getMemberAvatar = (member: GroupMember): string | undefined => {
  const avatar = member.avatar?.trim();
  return avatar || undefined;
};

const buildMemberOptions = (
  members: GroupMember[],
  selectedUserIds: string[],
  t: TFunction<'resource'>
): MemberOption[] => {
  const allGroupMemberIds = new Set(members.map((member) => member.userId));
  const memberOptions = members
    .filter((member) => member.role === 'MEMBER')
    .map((member) => ({
      userId: member.userId,
      name: getMemberDisplayName(member, t),
      description: t('permission.tag.memberRole'),
      avatar: getMemberAvatar(member),
    }));
  const existingIds = new Set(memberOptions.map((member) => member.userId));
  const missingSelectedOptions = selectedUserIds
    .filter((userId) => userId && !existingIds.has(userId) && !allGroupMemberIds.has(userId))
    .map((userId) => ({
      userId,
      name: t('permission.tag.memberFallback', { userId }),
      description: t('permission.tag.selected'),
    }));
  return [...memberOptions, ...missingSelectedOptions];
};

const selectionToUserIds = (keys: Selection, memberOptions: MemberOption[]): string[] => {
  if (keys === 'all') return memberOptions.map((member) => member.userId);
  return [...keys].map((key) => String(key));
};

const mergeVisibleSelection = (
  keys: Selection,
  visibleMemberOptions: MemberOption[],
  currentUserIds: string[]
): string[] => {
  const visibleMemberIds = new Set(visibleMemberOptions.map((member) => member.userId));
  const hiddenSelectedUserIds = currentUserIds.filter((userId) => !visibleMemberIds.has(userId));
  return Array.from(
    new Set([...hiddenSelectedUserIds, ...selectionToUserIds(keys, visibleMemberOptions)])
  );
};

const filterMemberOptions = (members: MemberOption[], keyword: string): MemberOption[] => {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return members;
  return members.filter((member) => {
    const searchableText = `${member.name} ${member.description} ${member.userId}`.toLowerCase();
    return searchableText.includes(normalizedKeyword);
  });
};

const normalizeFormForMode = (
  values: TagPermissionFormValues,
  mode: TagPolicyModalMode
): TagPermissionFormValues => {
  if (mode === 'access') {
    const accessScope = values.taggedResourceAclGrantScope;
    return {
      ...values,
      taggedResourceAclGrantScope: accessScope,
      taggedResourceAclGrantSpecifiedUsers: normalizeSpecifiedUsersByScope(
        accessScope,
        values.taggedResourceAclGrantSpecifiedUsers
      ),
    };
  }
  const mountScope = values.tagMountPermissionScope;
  return {
    ...values,
    tagMountPermissionScope: mountScope,
    tagMountSpecifiedUsers: normalizeSpecifiedUsersByScope(
      mountScope,
      values.tagMountSpecifiedUsers
    ),
  };
};

const buildSelectionFromTag = (tag: TagTreeNode, groupId?: string): DriveSelectionItem => {
  const scope = resolveDriveScope(groupId ? { type: 'group', groupId } : undefined).scope;
  const node = mapTagToFolderNode(tag, null, scope);
  const selection = toDriveSelectionItem(node);
  if (selection) return selection;
  return {
    nodeId: node.id,
    kind: 'folder',
    label: node.name,
    parentNodeId: node.parentId,
    scope,
    rootId: scope.rootId,
    groupId: scope.type === 'group' ? scope.groupId : undefined,
    tagId: tag.tagId,
  };
};

const buildFormFromTag = (tag: TagTreeNode): TagPermissionFormValues => ({
  taggedResourceAclGrantScope: tag.taggedResourceAclGrantScope ?? ACCESS_CONTROL_SCOPE.ALL,
  taggedResourceAclGrantSpecifiedUsers: tag.taggedResourceAclGrantSpecifiedUsers ?? [],
  tagMountPermissionScope: tag.tagMountPermissionScope ?? ACCESS_CONTROL_SCOPE.ALL,
  tagMountSpecifiedUsers: tag.tagMountSpecifiedUsers ?? [],
  grantedActions: normalizeResourceActions(tag.grantedActions),
});

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
  const groupService = useGroupService();
  const tagService = useTagService();
  const [permissionForm, setPermissionForm] =
    useState<TagPermissionFormValues>(DEFAULT_FORM_VALUES);
  const [selectedTag, setSelectedTag] = useState<DriveSelectionItem | null>(null);
  const [tagRefreshSeed, setTagRefreshSeed] = useState(0);
  const [accessMemberSearchValue, setAccessMemberSearchValue] = useState('');
  const [mountMemberSearchValue, setMountMemberSearchValue] = useState('');
  const showTagTree = !initialTagId;
  const selectedUserIds = Array.from(
    new Set([
      ...permissionForm.taggedResourceAclGrantSpecifiedUsers,
      ...permissionForm.tagMountSpecifiedUsers,
    ])
  );
  const {
    data: groupMembers = [],
    loading: groupMemberLoading,
    error: groupMemberError,
  } = useRequest(
    async () => {
      if (!groupId) return [];
      const members: GroupMember[] = [];
      let total = Number.POSITIVE_INFINITY;
      let page = 1;
      while (members.length < total && page <= MAX_GROUP_MEMBER_PAGE_COUNT) {
        const result = await groupService.fetchGroupMembers(groupId, page, GROUP_MEMBER_PAGE_SIZE);
        total = result.total;
        if (result.members.length === 0) break;
        members.push(...result.members);
        page += 1;
      }
      return members;
    },
    {
      ready: isOpen && Boolean(groupId),
      refreshDeps: [isOpen, groupId, groupService],
    }
  );
  const memberOptions = buildMemberOptions(groupMembers, selectedUserIds, t);

  const resetPermissionForm = () => {
    setPermissionForm(DEFAULT_FORM_VALUES);
  };

  const applyTagToForm = (tag: TagTreeNode) => {
    setPermissionForm(buildFormFromTag(tag));
  };

  const resolveTagById = async (tagId: string): Promise<TagTreeNode | undefined> => {
    let nextTag = tagService.getRawTagById(tagId, groupId) ?? tagService.getTagById(tagId, groupId);
    if (!nextTag) {
      await tagService.getRawTagTree(groupId);
      nextTag = tagService.getRawTagById(tagId, groupId);
    }
    if (!nextTag) {
      await tagService.getTagTree(groupId);
      nextTag = tagService.getTagById(tagId, groupId);
    }
    return nextTag;
  };

  const resolveCachedTag = (tagId: string): TagTreeNode | undefined =>
    tagService.getRawTagById(tagId, groupId) ?? tagService.getTagById(tagId, groupId);

  const { loading: tagRequestLoading } = useRequest(
    async () => {
      await tagService.getRawTagTree(groupId);
      return initialTagId ? resolveTagById(initialTagId) : undefined;
    },
    {
      ready: isOpen,
      refreshDeps: [groupId, initialTagId, isOpen],
      onBefore: () => {
        setSelectedTag(null);
        resetPermissionForm();
        setAccessMemberSearchValue('');
        setMountMemberSearchValue('');
        setTagRefreshSeed((prev) => prev + 1);
        if (!initialTagId) return;
        const cachedTag = resolveCachedTag(initialTagId);
        if (cachedTag) {
          setSelectedTag(buildSelectionFromTag(cachedTag, groupId));
          applyTagToForm(cachedTag);
        }
      },
      onSuccess: (tag) => {
        if (!tag) return;
        setSelectedTag(buildSelectionFromTag(tag, groupId));
        applyTagToForm(tag);
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );
  const initialTagLoading = Boolean(initialTagId) && tagRequestLoading;

  const handleTagChange = (nodes: DriveSelectionItem[]) => {
    const nextFolder = nodes.find((node) => node.kind === 'folder');
    if (!nextFolder?.tagId) {
      setSelectedTag(null);
      resetPermissionForm();
      return;
    }
    setSelectedTag(nextFolder);
    const fillFormByTag = async () => {
      const nextTag = await resolveTagById(nextFolder.tagId!);
      if (!nextTag) {
        resetPermissionForm();
        return;
      }
      applyTagToForm(nextTag);
    };
    void fillFormByTag();
  };

  const { loading: saving, run: runSavePermission } = useRequest(
    async (values: TagPermissionFormValues) => {
      if (!selectedTag?.tagId) return;
      if (!groupId) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_ID_REQUIRED);
      if (mode === 'access') {
        await tagService.updateTag({
          groupId,
          targetTagId: selectedTag.tagId,
          taggedResourceAclGrantScope: values.taggedResourceAclGrantScope,
          taggedResourceAclGrantSpecifiedUsers: values.taggedResourceAclGrantSpecifiedUsers,
          grantedActions: values.grantedActions,
        });
        return;
      }
      await tagService.updateTag({
        groupId,
        targetTagId: selectedTag.tagId,
        tagMountPermissionScope: values.tagMountPermissionScope,
        tagMountSpecifiedUsers: values.tagMountSpecifiedUsers,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleSubmit = () => {
    if (!selectedTag?.tagId) {
      return;
    }
    runSavePermission(normalizeFormForMode(permissionForm, mode));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (saving) return;
      setSelectedTag(null);
      setAccessMemberSearchValue('');
      setMountMemberSearchValue('');
      resetPermissionForm();
      onOpenChange(false);
    }
  };

  const handlePersonnelScopeChange = (target: PersonnelPolicyTarget, nextKey: Key) => {
    const nextScope = Number(nextKey) as AccessControlScope;
    setPermissionForm((prev) => {
      if (target === 'resourceGrant') {
        return {
          ...prev,
          taggedResourceAclGrantScope: nextScope,
          taggedResourceAclGrantSpecifiedUsers: normalizeSpecifiedUsersByScope(
            nextScope,
            prev.taggedResourceAclGrantSpecifiedUsers
          ),
        };
      }
      return {
        ...prev,
        tagMountPermissionScope: nextScope,
        tagMountSpecifiedUsers: normalizeSpecifiedUsersByScope(
          nextScope,
          prev.tagMountSpecifiedUsers
        ),
      };
    });
  };

  const handlePersonnelUsersChange = (
    target: PersonnelPolicyTarget,
    keys: Selection,
    visibleMemberOptions: MemberOption[],
    currentUserIds: string[]
  ) => {
    const userIds = mergeVisibleSelection(keys, visibleMemberOptions, currentUserIds);
    setPermissionForm((prev) => {
      if (target === 'resourceGrant') {
        return {
          ...prev,
          taggedResourceAclGrantSpecifiedUsers: userIds,
        };
      }
      return {
        ...prev,
        tagMountSpecifiedUsers: userIds,
      };
    });
  };

  const handlePersonnelSearchChange = (target: PersonnelPolicyTarget, value: string) => {
    if (target === 'resourceGrant') {
      setAccessMemberSearchValue(value);
      return;
    }
    setMountMemberSearchValue(value);
  };

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
      onActionsChange={(actions) => {
        setPermissionForm((prev) => ({ ...prev, grantedActions: actions }));
      }}
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
