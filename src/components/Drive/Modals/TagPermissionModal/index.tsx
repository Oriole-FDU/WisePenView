import AppAvatar from '@/components/Avatar';
import DriveNavigator from '@/components/Drive/DriveNavigator';
import ResourcePermissionActionIcon from '@/components/Drive/common/resourcePermissionActionIcon';
import {
  TAG_PERMISSION_ACTION_PRESET_OPTIONS,
  TAG_PERMISSION_ACTION_ROWS,
  TAG_PERMISSION_RESOURCE_STRATEGIES,
} from '@/components/Drive/common/tagPermissionPreset';
import { Empty, Spin } from '@/components/Feedback';
import { Checkbox, Input } from '@/components/Input';
import AppModal from '@/components/Overlay/AppModal';
import { useGroupService, useTagService } from '@/domains';
import { mapTagToFolderNode } from '@/domains/Drive/mapper/DriveServices.map';
import { ROLE, type GroupMember } from '@/domains/Group';
import {
  ACCESS_CONTROL_SCOPE,
  buildTagPermissionListActionSelectionPatch,
  getTagPermissionPresetValues,
  isTagPermissionListActionSelected,
  normalizeResourceActions,
  type AccessControlScope,
  type TagPermissionListAction,
  type TagPermissionPresetKey,
  type TagResourceAction,
  type TagTreeNode,
} from '@/domains/Tag';
import { useEffectForce } from '@/hooks/useEffectForce';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { Button, ListBox, Tabs, TextField, toast, type Selection } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Check, X } from 'lucide-react';
import { useState, type Key } from 'react';
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
  { scope: ACCESS_CONTROL_SCOPE.ALL, label: '全部' },
  { scope: ACCESS_CONTROL_SCOPE.ONLY_ADMIN, label: '仅管理员' },
  { scope: ACCESS_CONTROL_SCOPE.BLACKLIST, label: '黑名单' },
  { scope: ACCESS_CONTROL_SCOPE.WHITELIST, label: '白名单' },
] as const;

const isSpecifiedUserScope = (scope: AccessControlScope): boolean =>
  scope === ACCESS_CONTROL_SCOPE.WHITELIST || scope === ACCESS_CONTROL_SCOPE.BLACKLIST;

const normalizeSpecifiedUsersByScope = (scope: AccessControlScope, userIds: string[]): string[] =>
  isSpecifiedUserScope(scope) ? userIds : [];

const isSameActionSet = (
  left: TagResourceAction[] | undefined,
  right: TagResourceAction[] | undefined
): boolean => {
  const leftSet = new Set(normalizeResourceActions(left));
  const rightSet = new Set(normalizeResourceActions(right));
  if (leftSet.size !== rightSet.size) return false;
  return [...leftSet].every((action) => rightSet.has(action));
};

const resolveActionPresetKey = (
  values: TagPermissionFormValues
): Exclude<TagPermissionPresetKey, 'custom'> | 'custom' => {
  const matchedPreset = TAG_PERMISSION_ACTION_PRESET_OPTIONS.find((preset) =>
    isSameActionSet(preset.values.grantedActions, values.grantedActions)
  );
  return matchedPreset?.key ?? 'custom';
};

const getDisplayInitial = (name: string): string => name.trim().charAt(0).toUpperCase() || '?';

const getMemberDisplayName = (member: GroupMember): string =>
  member.realname?.trim() || member.nickname?.trim() || `用户 ${member.userId}`;

const getMemberAvatar = (member: GroupMember): string | undefined => {
  const avatar = member.avatar?.trim();
  return avatar || undefined;
};

const buildMemberOptions = (members: GroupMember[], selectedUserIds: string[]): MemberOption[] => {
  const allGroupMemberIds = new Set(members.map((member) => member.userId));
  const memberOptions = members
    .filter((member) => member.role === 'MEMBER')
    .map((member) => ({
      userId: member.userId,
      name: getMemberDisplayName(member),
      description: ROLE.keyLabels[member.role],
      avatar: getMemberAvatar(member),
    }));
  const existingIds = new Set(memberOptions.map((member) => member.userId));
  const missingSelectedOptions = selectedUserIds
    .filter((userId) => userId && !existingIds.has(userId) && !allGroupMemberIds.has(userId))
    .map((userId) => ({
      userId,
      name: `用户 ${userId}`,
      description: '已选择',
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
  const groupService = useGroupService();
  const tagService = useTagService();
  const [permissionForm, setPermissionForm] =
    useState<TagPermissionFormValues>(DEFAULT_FORM_VALUES);
  const [selectedTag, setSelectedTag] = useState<DriveSelectionItem | null>(null);
  const [tagRefreshSeed, setTagRefreshSeed] = useState(0);
  const [initialTagLoading, setInitialTagLoading] = useState(false);
  const [accessMemberSearchValue, setAccessMemberSearchValue] = useState('');
  const [mountMemberSearchValue, setMountMemberSearchValue] = useState('');
  const showTagTree = !initialTagId;
  const selectedPresetKey = resolveActionPresetKey(permissionForm);
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
  const memberOptions = buildMemberOptions(groupMembers, selectedUserIds);

  const resetPermissionForm = () => {
    setPermissionForm(DEFAULT_FORM_VALUES);
  };

  const applyPresetToForm = (presetKey: TagPermissionPresetKey) => {
    const presetValues = getTagPermissionPresetValues(presetKey);
    if (!presetValues) return;
    setPermissionForm((prev) => ({
      ...prev,
      grantedActions: presetValues.grantedActions,
    }));
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

  const handleModalShow = () => {
    setSelectedTag(null);
    resetPermissionForm();
    setAccessMemberSearchValue('');
    setMountMemberSearchValue('');
    setTagRefreshSeed((prev) => prev + 1);
    void (async () => {
      if (initialTagId) {
        setInitialTagLoading(true);
        const cachedTag = resolveCachedTag(initialTagId);
        if (cachedTag) {
          setSelectedTag(buildSelectionFromTag(cachedTag, groupId));
          applyTagToForm(cachedTag);
        }
        try {
          await tagService.getRawTagTree(groupId);
          const tag = await resolveTagById(initialTagId);
          if (tag) {
            setSelectedTag(buildSelectionFromTag(tag, groupId));
            applyTagToForm(tag);
          }
        } catch (err) {
          toast.danger(parseErrorMessage(err));
        } finally {
          setInitialTagLoading(false);
        }
        return;
      }

      try {
        await tagService.getRawTagTree(groupId);
      } catch (err) {
        toast.danger(parseErrorMessage(err));
      }
    })();
  };

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
      setInitialTagLoading(false);
      setAccessMemberSearchValue('');
      setMountMemberSearchValue('');
      resetPermissionForm();
      onOpenChange(false);
    }
  };

  const handleActionToggle = (action: TagPermissionListAction, checked: boolean) => {
    setPermissionForm((prev) => ({
      ...prev,
      ...buildTagPermissionListActionSelectionPatch(prev, action, checked),
    }));
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

  /**
   * 弹窗每次打开都需要重新读取目标标签权限；这里依赖 Overlay 打开时机，
   * 不能改成事件回调之外的请求，否则顶部入口选择标签与右栏直达标签会不同步。
   */
  useEffectForce(() => {
    if (!isOpen) return;
    handleModalShow();
  }, [isOpen]);

  const renderPermissionTable = () => {
    return (
      <div className={styles.permissionTableShell}>
        <table className={styles.permissionTable}>
          <thead>
            <tr>
              <th className={styles.actionHeader}>权限动作</th>
              <th className={styles.toggleHeader}>开启</th>
              {TAG_PERMISSION_RESOURCE_STRATEGIES.map((strategy) => (
                <th key={strategy.key} className={styles.resourceApplicabilityHeader}>
                  {strategy.label}适用
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TAG_PERMISSION_ACTION_ROWS.map((row) => {
              const selected = isTagPermissionListActionSelected(permissionForm, row.action);
              return (
                <tr key={row.key}>
                  <th className={styles.actionCell}>
                    <span className={styles.actionName}>
                      <ResourcePermissionActionIcon
                        action={row.action.action}
                        className={styles.actionIcon}
                      />
                      <span className={styles.actionText}>{row.label}</span>
                    </span>
                  </th>
                  <td
                    className={styles.permissionToggleCell}
                    onClick={() => handleActionToggle(row.action, !selected)}
                  >
                    <Checkbox
                      className={styles.permissionCheckbox}
                      aria-label={row.label}
                      isSelected={selected}
                      onChange={(isSelected) => handleActionToggle(row.action, isSelected)}
                      onClick={(event) => event.stopPropagation()}
                    />
                  </td>
                  {TAG_PERMISSION_RESOURCE_STRATEGIES.map((strategy) => {
                    const supported = row.supportedStrategyKeys.includes(strategy.key);
                    const cellClassName = !supported
                      ? styles.unsupportedCell
                      : selected
                        ? styles.supportedCell
                        : styles.deniedCell;
                    return (
                      <td key={strategy.key} className={cellClassName}>
                        {!supported ? (
                          <span aria-hidden="true">-</span>
                        ) : selected ? (
                          <Check
                            size={14}
                            aria-label={`${strategy.label}${row.label}已开启`}
                            className={styles.permissionStateIcon}
                          />
                        ) : (
                          <X
                            size={14}
                            aria-label={`${strategy.label}${row.label}未开启`}
                            className={styles.permissionStateIcon}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMemberList = (policy: PersonnelPolicyConfig) => {
    if (groupMemberLoading) {
      return (
        <div className={styles.memberState}>
          <Spin size="large" tip="加载成员中" />
        </div>
      );
    }

    if (groupMemberError) {
      return <div className={styles.memberState}>{parseErrorMessage(groupMemberError)}</div>;
    }

    if (memberOptions.length === 0) {
      return (
        <div className={styles.memberState}>
          <Empty description="暂无可选成员" />
        </div>
      );
    }

    const visibleMemberOptions = filterMemberOptions(memberOptions, policy.searchValue);
    if (visibleMemberOptions.length === 0) {
      return (
        <div className={styles.memberState}>
          <Empty description="没有匹配的成员" />
        </div>
      );
    }

    const visibleMemberIds = new Set(visibleMemberOptions.map((member) => member.userId));
    const visibleSelectedUserIds = policy.specifiedUsers.filter((userId) =>
      visibleMemberIds.has(userId)
    );

    return (
      <ListBox
        aria-label={`${policy.title}名单成员`}
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
            <div className={styles.personnelCount}>已选 {policy.specifiedUsers.length} 人</div>
          ) : null}
        </div>
        <Tabs
          className={styles.scopeTabs}
          selectedKey={String(policy.scope)}
          onSelectionChange={(key) => handlePersonnelScopeChange(policy.target, key)}
        >
          <Tabs.ListContainer className={styles.scopeTabsListContainer}>
            <Tabs.List className={styles.scopeTabsList} aria-label={`${policy.title}范围`}>
              {PERSONNEL_SCOPE_OPTIONS.map((option) => (
                <Tabs.Tab
                  key={String(option.scope)}
                  id={String(option.scope)}
                  className={styles.scopeTab}
                >
                  {option.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
        {shouldShowMemberPicker ? (
          <>
            <TextField
              aria-label={`${policy.title}搜索成员`}
              value={policy.searchValue}
              onChange={(value) => handlePersonnelSearchChange(policy.target, value)}
            >
              <Input placeholder="搜索成员" className={styles.memberSearchInput} />
            </TextField>
            {renderMemberList(policy)}
          </>
        ) : (
          <div className={styles.memberState}>当前策略无需配置名单</div>
        )}
      </section>
    );
  };

  const renderPermissionPanel = () => (
    <section className={styles.permissionCard} aria-label="资源权限动作">
      <div className={styles.presetBar}>
        <span className={styles.presetLabel}>基于预设</span>
        <div className={styles.presetButtons} role="group" aria-label="基于预设">
          {TAG_PERMISSION_ACTION_PRESET_OPTIONS.map((preset) => (
            <Button
              key={preset.key}
              variant={selectedPresetKey === preset.key ? 'primary' : 'secondary'}
              size="sm"
              onPress={() => applyPresetToForm(preset.key)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <span className={styles.currentPreset}>
          当前预设：
          {TAG_PERMISSION_ACTION_PRESET_OPTIONS.find((preset) => preset.key === selectedPresetKey)
            ?.label ?? '自定义'}
        </span>
      </div>
      {renderPermissionTable()}
    </section>
  );

  const renderAccessPolicyPanel = () => {
    const accessPolicy: PersonnelPolicyConfig = {
      target: 'resourceGrant',
      title: '访问名单',
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
      title: '挂载名单',
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
      title={mode === 'access' ? '访问策略' : '挂载策略'}
      size="lg"
      containerClassName={mode === 'mount' ? styles.mountModalContainer : styles.modalContainer}
      dialogClassName={mode === 'mount' ? styles.mountModalDialog : styles.modalDialog}
      isDismissable={!saving}
      actions={
        <>
          <Button variant="secondary" isDisabled={saving} onPress={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="primary"
            isDisabled={saving || !selectedTag || !groupId}
            aria-busy={saving || undefined}
            onPress={handleSubmit}
          >
            保存
          </Button>
        </>
      }
    >
      <div className={styles.modalFormPadding}>
        <div className={styles.wrapper}>
          {showTagTree ? (
            <div className={styles.leftPane}>
              <div className={styles.leftTitle}>选择标签</div>
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
                  <Empty description="请选择一个标签" />
                ) : (
                  <Spin size="large" tip="加载标签权限中" />
                )}
              </div>
            ) : (
              <>
                {initialTagLoading ? (
                  <div className={styles.emptyState}>
                    <Spin size="large" tip="加载标签权限中" />
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
