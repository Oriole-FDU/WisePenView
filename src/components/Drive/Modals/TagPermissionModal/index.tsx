import { Empty, Spin } from '@/components/Common/Feedback';
import SegmentedTabs from '@/components/Common/SegmentedTabs';
import DriveNav from '@/components/Drive/DriveNav';
import { useDriveService, useGroupService, useTagService } from '@/domains';
import type { DriveNode } from '@/domains/Drive';
import { mapTagToFolderNode } from '@/domains/Drive/mapper/DriveServices.map';
import type { GroupMember } from '@/domains/Group';
import {
  ACCESS_CONTROL_SCOPE,
  actionsToPermissionCode,
  getResourceActionImpliedActions,
  getResourceActionImpliedMask,
  hasResourceAction,
  normalizeResourceActions,
  permissionCodeToActions,
  TAG_RESOURCE_ACTION,
  type AccessControlScope,
  type TagResourceAction,
  type TagTreeNode,
} from '@/domains/Tag';
import { useEffectForce } from '@/hooks/useEffectForce';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { Button, Checkbox, Modal, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import {
  DEFAULT_DRIVE_ROOT_ID,
  toDriveSelectionItem,
  type DriveSelectionItem,
} from '../../common/driveComponentModel';
import type { TagPermissionModalProps } from './index.type';
import styles from './style.module.less';

type TagPermissionFormValues = {
  taggedResourceAclGrantScope?: AccessControlScope;
  taggedResourceAclGrantSpecifiedUsers?: string[];
  grantedActions?: TagResourceAction[];
  tagMountPermissionScope?: AccessControlScope;
  tagMountSpecifiedUsers?: string[];
};

const MEMBER_PAGE_SIZE = 200;

const DEFAULT_FORM_VALUES: Required<TagPermissionFormValues> = {
  taggedResourceAclGrantScope: ACCESS_CONTROL_SCOPE.ALL,
  taggedResourceAclGrantSpecifiedUsers: [],
  grantedActions: [],
  tagMountPermissionScope: ACCESS_CONTROL_SCOPE.ALL,
  tagMountSpecifiedUsers: [],
};

const isAclUserListMode = (mode?: AccessControlScope) =>
  mode === ACCESS_CONTROL_SCOPE.WHITELIST || mode === ACCESS_CONTROL_SCOPE.BLACKLIST;

const isMountUserListMode = (mode?: AccessControlScope) =>
  mode === ACCESS_CONTROL_SCOPE.WHITELIST || mode === ACCESS_CONTROL_SCOPE.BLACKLIST;

const getSelectableMembers = (members?: GroupMember[]) =>
  (members ?? []).filter((m) => m.role !== 'ADMIN' && m.role !== 'OWNER');

const buildSelectableMemberIdSet = (members: GroupMember[]) =>
  new Set(members.map((m) => m.userId));

const buildMemberOptions = (members: GroupMember[]) =>
  members.map((member) => {
    const nickname = member.nickname?.trim();
    const realname = member.realname?.trim();
    const label = nickname && realname ? `${nickname} (${realname})` : nickname || realname || '-';
    return { label, value: member.userId };
  });

const filterSelectableUserIds = (ids: string[] | undefined, selectableMemberIdSet: Set<string>) => {
  if (!ids || ids.length === 0) return [];
  if (selectableMemberIdSet.size === 0) return ids;
  return ids.filter((id) => selectableMemberIdSet.has(id));
};

const buildSelectionFromTag = (tag: TagTreeNode): DriveSelectionItem => {
  const node = mapTagToFolderNode(tag, null);
  const selection = toDriveSelectionItem(node);
  if (selection) return selection;
  return {
    nodeId: node.id,
    kind: 'folder',
    label: node.name,
    parentNodeId: node.parentId,
    tagId: tag.tagId,
  };
};

async function findFolderNodeIdByTagId(params: {
  rootId: string;
  groupId?: string;
  tagId: string;
  loadNodeChildren: (nodeId: string, groupId?: string) => Promise<DriveNode[]>;
}): Promise<string | undefined> {
  const { rootId, groupId, tagId, loadNodeChildren } = params;
  const queue: string[] = [rootId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || visited.has(currentId)) continue;
    visited.add(currentId);

    const children = await loadNodeChildren(currentId, groupId);
    for (const child of children) {
      if (child.type !== 'folder') continue;
      if (child.tagId === tagId) return child.id;
      queue.push(child.id);
    }
  }

  return undefined;
}

type UserSelectionListProps = {
  label: string;
  loading: boolean;
  options: Array<{ label: string; value: string }>;
  value: string[];
  onToggle: (userId: string, isSelected: boolean) => void;
};

function UserSelectionList({ label, loading, options, value, onToggle }: UserSelectionListProps) {
  const selectedIdSet = new Set(value);

  return (
    <div className={styles.userSelectBlock}>
      <div className={styles.selectHint}>{label}</div>
      <div className={styles.userSelectList}>
        {loading ? (
          <div className={styles.userSelectLoading}>
            <Spin size="small" />
          </div>
        ) : options.length === 0 ? (
          <div className={styles.userSelectEmpty}>暂无可选用户</div>
        ) : (
          options.map((option) => (
            <Checkbox
              key={option.value}
              isSelected={selectedIdSet.has(option.value)}
              onChange={(isSelected) => onToggle(option.value, isSelected)}
              variant="secondary"
              className={styles.userSelectItem}
            >
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Content>
                <span data-slot="label">{option.label}</span>
              </Checkbox.Content>
            </Checkbox>
          ))
        )}
      </div>
    </div>
  );
}

const TagPermissionModal = ({
  isOpen,
  groupId,
  initialTagId,
  onOpenChange,
  onSuccess,
}: TagPermissionModalProps) => {
  const tagService = useTagService();
  const driveService = useDriveService();
  const groupService = useGroupService();
  const [permissionForm, setPermissionForm] =
    useState<Required<TagPermissionFormValues>>(DEFAULT_FORM_VALUES);
  const [selectedTag, setSelectedTag] = useState<DriveSelectionItem | null>(null);
  const [tagRefreshSeed, setTagRefreshSeed] = useState(0);
  const [tagInitialIds, setTagInitialIds] = useState<string[] | undefined>(undefined);
  const [hoveredAction, setHoveredAction] = useState<TagResourceAction | null>(null);
  const [initialTagLoading, setInitialTagLoading] = useState(false);

  const { run: runResolveInitialNode } = useRequest(
    async (tagId: string): Promise<string[] | undefined> => {
      const nodeId = await findFolderNodeIdByTagId({
        rootId: DEFAULT_DRIVE_ROOT_ID,
        groupId,
        tagId,
        loadNodeChildren: (nodeId, currentGroupId) =>
          driveService.loadNodeChildren({ nodeId, groupId: currentGroupId }),
      });
      return nodeId ? [nodeId] : undefined;
    },
    {
      manual: true,
      onSuccess: (ids) => {
        setTagInitialIds(ids);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
        setTagInitialIds(undefined);
      },
    }
  );

  const {
    data: members,
    loading: membersLoading,
    run: runFetchMembers,
  } = useRequest(
    async (): Promise<GroupMember[]> => {
      if (!groupId) return [];
      const allMembers: GroupMember[] = [];
      let page = 1;
      let total = 0;
      do {
        const { members: pageMembers, total: nextTotal } = await groupService.fetchGroupMembers(
          groupId,
          page,
          MEMBER_PAGE_SIZE
        );
        allMembers.push(...pageMembers);
        total = nextTotal;
        page += 1;
      } while (allMembers.length < total);
      return allMembers;
    },
    {
      manual: true,
      onSuccess: (list) => {
        const nextSelectableMemberIdSet = buildSelectableMemberIdSet(getSelectableMembers(list));
        if (nextSelectableMemberIdSet.size === 0) return;
        setPermissionForm((prev) => ({
          ...prev,
          taggedResourceAclGrantSpecifiedUsers: filterSelectableUserIds(
            prev.taggedResourceAclGrantSpecifiedUsers,
            nextSelectableMemberIdSet
          ),
          tagMountSpecifiedUsers: filterSelectableUserIds(
            prev.tagMountSpecifiedUsers,
            nextSelectableMemberIdSet
          ),
        }));
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const selectableMembers = getSelectableMembers(members);
  const selectableMemberIdSet = buildSelectableMemberIdSet(selectableMembers);
  const memberOptions = buildMemberOptions(selectableMembers);
  const actionHighlightSet = hoveredAction
    ? new Set([hoveredAction, ...getResourceActionImpliedActions(hoveredAction)])
    : null;
  const showTagTree = !initialTagId;

  const resetPermissionForm = () => {
    setPermissionForm(DEFAULT_FORM_VALUES);
  };

  const updatePermissionForm = <K extends keyof Required<TagPermissionFormValues>>(
    key: K,
    value: Required<TagPermissionFormValues>[K]
  ) => {
    setPermissionForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleUserSelection = (
    key: 'taggedResourceAclGrantSpecifiedUsers' | 'tagMountSpecifiedUsers',
    userId: string,
    isSelected: boolean
  ) => {
    setPermissionForm((prev) => {
      const current = prev[key];
      return {
        ...prev,
        [key]: isSelected ? [...current, userId] : current.filter((id) => id !== userId),
      };
    });
  };

  const applyTagToForm = (tag: TagTreeNode) => {
    setPermissionForm({
      taggedResourceAclGrantScope: tag.taggedResourceAclGrantScope ?? ACCESS_CONTROL_SCOPE.ALL,
      taggedResourceAclGrantSpecifiedUsers: filterSelectableUserIds(
        tag.taggedResourceAclGrantSpecifiedUsers,
        selectableMemberIdSet
      ),
      grantedActions: normalizeResourceActions(tag.grantedActions),
      tagMountPermissionScope: tag.tagMountPermissionScope ?? ACCESS_CONTROL_SCOPE.ALL,
      tagMountSpecifiedUsers: filterSelectableUserIds(
        tag.tagMountSpecifiedUsers,
        selectableMemberIdSet
      ),
    });
  };

  const resolveTagById = async (tagId: string): Promise<TagTreeNode | undefined> => {
    let nextTag = tagService.getTagById(tagId, groupId);
    if (!nextTag) {
      await tagService.getTagTree(groupId);
      nextTag = tagService.getTagById(tagId, groupId);
    }
    return nextTag;
  };

  const resolveCachedTag = (tagId: string): TagTreeNode | undefined =>
    tagService.getTagById(tagId, groupId);

  const handleModalShow = () => {
    setSelectedTag(null);
    resetPermissionForm();
    setTagRefreshSeed((prev) => prev + 1);
    setTagInitialIds(undefined);
    void (async () => {
      if (initialTagId) {
        if (showTagTree) {
          runResolveInitialNode(initialTagId);
        }
        setInitialTagLoading(true);
        const cachedTag = resolveCachedTag(initialTagId);
        if (cachedTag) {
          setSelectedTag(buildSelectionFromTag(cachedTag));
          applyTagToForm(cachedTag);
        }
        try {
          await tagService.getTagTree(groupId);
        } catch (err) {
          toast.danger(parseErrorMessage(err));
        }
        try {
          const tag = await resolveTagById(initialTagId);
          if (tag) {
            setSelectedTag(buildSelectionFromTag(tag));
            applyTagToForm(tag);
          }
        } finally {
          setInitialTagLoading(false);
        }
        return;
      }

      try {
        await tagService.getTagTree(groupId);
      } catch (err) {
        toast.danger(parseErrorMessage(err));
      }
    })();
    if (groupId) {
      runFetchMembers();
    }
  };

  const handleTagChange = (nodes: DriveSelectionItem[]) => {
    const nextFolder = nodes.find((node) => node.kind === 'folder');
    if (!nextFolder) {
      setSelectedTag(null);
      resetPermissionForm();
      return;
    }
    if (!nextFolder.tagId) {
      setSelectedTag(null);
      resetPermissionForm();
      return;
    }
    const selectedTagId = nextFolder.tagId;
    setSelectedTag(nextFolder);
    const fillFormByTag = async () => {
      const nextTag = await resolveTagById(selectedTagId);
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
      const taggedResourceAclGrantScope =
        values.taggedResourceAclGrantScope ?? ACCESS_CONTROL_SCOPE.ALL;
      const tagMountPermissionScope = values.tagMountPermissionScope ?? ACCESS_CONTROL_SCOPE.ALL;
      await tagService.updateTag({
        groupId,
        targetTagId: selectedTag.tagId,
        taggedResourceAclGrantScope,
        taggedResourceAclGrantSpecifiedUsers: filterSelectableUserIds(
          values.taggedResourceAclGrantSpecifiedUsers,
          selectableMemberIdSet
        ),
        grantedActions: normalizeResourceActions(values.grantedActions),
        tagMountPermissionScope,
        tagMountSpecifiedUsers: filterSelectableUserIds(
          values.tagMountSpecifiedUsers,
          selectableMemberIdSet
        ),
      });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('标签权限已更新');
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleSubmit = async () => {
    if (!selectedTag?.tagId) {
      toast.warning('请先选择标签');
      return;
    }
    runSavePermission(permissionForm);
  };

  // TODO: refactor
  useEffectForce(() => {
    if (!isOpen) return;
    handleModalShow();
  }, [isOpen]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (saving) return;
      setSelectedTag(null);
      setTagInitialIds(undefined);
      setInitialTagLoading(false);
      resetPermissionForm();
      onOpenChange(false);
    }
  };

  const selectedActions = normalizeResourceActions(permissionForm.grantedActions);
  const selectedActionSet = new Set(selectedActions);

  const handleActionToggle = (action: TagResourceAction, checked: boolean) => {
    const current = permissionForm.grantedActions;
    if (checked) {
      const nextCode = actionsToPermissionCode([...current, action]);
      updatePermissionForm('grantedActions', permissionCodeToActions(nextCode));
      return;
    }
    const next = normalizeResourceActions(
      current.filter((item) => !hasResourceAction(getResourceActionImpliedMask(item), action))
    );
    updatePermissionForm('grantedActions', next);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable={!saving}>
        <Modal.Container size="lg" placement="center" className={styles.modalContainer}>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>标签权限管理</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className={styles.modalFormPadding}>
                <div className={styles.wrapper}>
                  {showTagTree ? (
                    <div className={styles.leftPane}>
                      <div className={styles.leftTitle}>选择标签</div>
                      <DriveNav
                        scope={groupId ? { type: 'group', groupId } : undefined}
                        renderableTypes={['folder']}
                        selectableTypes={['folder']}
                        multiple={false}
                        refreshTrigger={tagRefreshSeed}
                        initialSelectedIds={tagInitialIds}
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
                        <div className={styles.sectionCard}>
                          <div className={styles.sectionTitle}>访问权限下发模式</div>
                          <SegmentedTabs
                            ariaLabel="访问权限下发模式"
                            className={styles.modeRow}
                            items={ACCESS_CONTROL_SCOPE.options.map((item) => ({
                              key: item.value,
                              label: item.label,
                            }))}
                            selectedKey={permissionForm.taggedResourceAclGrantScope}
                            onSelectionChange={(taggedResourceAclGrantScope) =>
                              setPermissionForm((prev) => ({
                                ...prev,
                                taggedResourceAclGrantScope,
                                taggedResourceAclGrantSpecifiedUsers: isAclUserListMode(
                                  taggedResourceAclGrantScope
                                )
                                  ? filterSelectableUserIds(
                                      prev.taggedResourceAclGrantSpecifiedUsers,
                                      selectableMemberIdSet
                                    )
                                  : [],
                              }))
                            }
                          />

                          {isAclUserListMode(permissionForm.taggedResourceAclGrantScope) ? (
                            <UserSelectionList
                              label="选择用户（不含管理员）"
                              loading={membersLoading}
                              options={memberOptions}
                              value={permissionForm.taggedResourceAclGrantSpecifiedUsers}
                              onToggle={(userId, isSelected) =>
                                toggleUserSelection(
                                  'taggedResourceAclGrantSpecifiedUsers',
                                  userId,
                                  isSelected
                                )
                              }
                            />
                          ) : null}

                          <div className={styles.actionGroup}>
                            <div className={styles.selectHint}>访问权限</div>
                            <div className={styles.actionList}>
                              {TAG_RESOURCE_ACTION.options.map((item) => {
                                const action = item.value as TagResourceAction;
                                const isHighlighted = actionHighlightSet?.has(action);
                                return (
                                  <div
                                    key={item.key}
                                    className={
                                      isHighlighted
                                        ? `${styles.actionItem} ${styles.actionItemHighlight}`
                                        : styles.actionItem
                                    }
                                    onMouseEnter={() => setHoveredAction(action)}
                                    onMouseLeave={() => setHoveredAction(null)}
                                  >
                                    <Checkbox
                                      isSelected={selectedActionSet.has(action)}
                                      onChange={(isSelected) =>
                                        handleActionToggle(action, isSelected)
                                      }
                                      variant="secondary"
                                    >
                                      <Checkbox.Control>
                                        <Checkbox.Indicator />
                                      </Checkbox.Control>
                                      <Checkbox.Content>
                                        <span data-slot="label" className={styles.actionLabel}>
                                          {item.label}
                                        </span>
                                      </Checkbox.Content>
                                    </Checkbox>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className={styles.sectionCard}>
                          <div className={styles.sectionTitle}>资源挂载权限</div>
                          <SegmentedTabs
                            ariaLabel="资源挂载权限"
                            className={styles.modeRow}
                            items={ACCESS_CONTROL_SCOPE.options.map((item) => ({
                              key: item.value,
                              label: item.label,
                            }))}
                            selectedKey={permissionForm.tagMountPermissionScope}
                            onSelectionChange={(tagMountPermissionScope) =>
                              setPermissionForm((prev) => ({
                                ...prev,
                                tagMountPermissionScope,
                                tagMountSpecifiedUsers: isMountUserListMode(tagMountPermissionScope)
                                  ? filterSelectableUserIds(
                                      prev.tagMountSpecifiedUsers,
                                      selectableMemberIdSet
                                    )
                                  : [],
                              }))
                            }
                          />

                          {isMountUserListMode(permissionForm.tagMountPermissionScope) ? (
                            <UserSelectionList
                              label="选择用户（不含管理员）"
                              loading={membersLoading}
                              options={memberOptions}
                              value={permissionForm.tagMountSpecifiedUsers}
                              onToggle={(userId, isSelected) =>
                                toggleUserSelection('tagMountSpecifiedUsers', userId, isSelected)
                              }
                            />
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={() => onOpenChange(false)} isDisabled={saving}>
                取消
              </Button>
              <Button
                variant="primary"
                onPress={handleSubmit}
                isDisabled={saving || !selectedTag || !groupId}
              >
                保存
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default TagPermissionModal;
