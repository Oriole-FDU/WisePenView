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
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Checkbox, Empty, Form, Modal, Radio, Select, Spin } from 'antd';
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
    const label = nickname && realname ? `${nickname} (${realname})` : nickname || realname;
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

const TagPermissionModal = ({
  open,
  groupId,
  initialTagId,
  onCancel,
  onSuccess,
}: TagPermissionModalProps) => {
  const tagService = useTagService();
  const driveService = useDriveService();
  const groupService = useGroupService();
  const [form] = Form.useForm<TagPermissionFormValues>();
  const [selectedTag, setSelectedTag] = useState<DriveSelectionItem | null>(null);
  const [tagRefreshSeed, setTagRefreshSeed] = useState(0);
  const [tagInitialIds, setTagInitialIds] = useState<string[] | undefined>(undefined);
  const [hoveredAction, setHoveredAction] = useState<TagResourceAction | null>(null);
  const [initialTagLoading, setInitialTagLoading] = useState(false);
  const watchedGrantedActions = Form.useWatch('grantedActions', form);

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

  const applyTagToForm = (tag: TagTreeNode) => {
    form.setFieldsValue({
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

  const handleOpenChange = (visible: boolean) => {
    if (!visible) {
      setSelectedTag(null);
      setTagInitialIds(undefined);
      setInitialTagLoading(false);
      form.resetFields();
      return;
    }
    setSelectedTag(null);
    form.resetFields();
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
      form.resetFields();
      return;
    }
    if (!nextFolder.tagId) {
      setSelectedTag(null);
      form.resetFields();
      return;
    }
    const selectedTagId = nextFolder.tagId;
    setSelectedTag(nextFolder);
    const fillFormByTag = async () => {
      const nextTag = await resolveTagById(selectedTagId);
      if (!nextTag) {
        form.resetFields();
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
        onCancel();
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
    const formValues = await form.validateFields();
    runSavePermission(formValues);
  };

  const handleCancel = () => {
    onCancel();
  };

  const selectedActions = normalizeResourceActions(watchedGrantedActions);
  const selectedActionSet = new Set(selectedActions);

  const handleActionToggle = (action: TagResourceAction, checked: boolean) => {
    const current = (form.getFieldValue('grantedActions') ?? []) as TagResourceAction[];
    if (checked) {
      const nextCode = actionsToPermissionCode([...current, action]);
      form.setFieldValue('grantedActions', permissionCodeToActions(nextCode));
      return;
    }
    const next = normalizeResourceActions(
      current.filter((item) => !hasResourceAction(getResourceActionImpliedMask(item), action))
    );
    form.setFieldValue('grantedActions', next);
  };

  return (
    <Modal
      title="标签权限管理"
      open={open}
      onCancel={handleCancel}
      afterOpenChange={handleOpenChange}
      destroyOnHidden
      wrapClassName={styles.modalWrap}
      width={860}
      footer={[
        <Button key="cancel" onPress={handleCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          variant="primary"
          onPress={handleSubmit}
          isDisabled={saving || !selectedTag || !groupId}
        >
          保存
        </Button>,
      ]}
    >
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
            <Form form={form} layout="vertical">
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
                    <Form.Item name="taggedResourceAclGrantScope" className={styles.modeRow}>
                      <Radio.Group
                        options={ACCESS_CONTROL_SCOPE.options.map((item) => ({
                          label: item.label,
                          value: item.value,
                        }))}
                        optionType="button"
                        buttonStyle="solid"
                      />
                    </Form.Item>

                    <Form.Item
                      noStyle
                      shouldUpdate={(prev, next) =>
                        prev.taggedResourceAclGrantScope !== next.taggedResourceAclGrantScope
                      }
                    >
                      {({ getFieldValue }) =>
                        isAclUserListMode(getFieldValue('taggedResourceAclGrantScope')) ? (
                          <Form.Item
                            name="taggedResourceAclGrantSpecifiedUsers"
                            label={
                              <span className={styles.selectHint}>选择用户（不含管理员）</span>
                            }
                          >
                            <Select
                              mode="multiple"
                              options={memberOptions}
                              loading={membersLoading}
                              placeholder="请选择用户"
                              optionFilterProp="label"
                              maxTagCount="responsive"
                            />
                          </Form.Item>
                        ) : null
                      }
                    </Form.Item>

                    <Form.Item label="访问权限" className={styles.actionGroup}>
                      <Form.Item name="grantedActions" hidden>
                        <Select mode="multiple" options={[]} />
                      </Form.Item>
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
                                checked={selectedActionSet.has(action)}
                                onChange={(event) =>
                                  handleActionToggle(action, event.target.checked)
                                }
                              >
                                <span className={styles.actionLabel}>{item.label}</span>
                              </Checkbox>
                            </div>
                          );
                        })}
                      </div>
                    </Form.Item>
                  </div>

                  <div className={styles.sectionCard}>
                    <div className={styles.sectionTitle}>资源挂载权限</div>
                    <Form.Item name="tagMountPermissionScope" className={styles.modeRow}>
                      <Radio.Group
                        options={ACCESS_CONTROL_SCOPE.options.map((item) => ({
                          label: item.label,
                          value: item.value,
                        }))}
                        optionType="button"
                        buttonStyle="solid"
                      />
                    </Form.Item>

                    <Form.Item
                      noStyle
                      shouldUpdate={(prev, next) =>
                        prev.tagMountPermissionScope !== next.tagMountPermissionScope
                      }
                    >
                      {({ getFieldValue }) =>
                        isMountUserListMode(getFieldValue('tagMountPermissionScope')) ? (
                          <Form.Item
                            name="tagMountSpecifiedUsers"
                            label={
                              <span className={styles.selectHint}>选择用户（不含管理员）</span>
                            }
                          >
                            <Select
                              mode="multiple"
                              options={memberOptions}
                              loading={membersLoading}
                              placeholder="请选择用户"
                              optionFilterProp="label"
                              maxTagCount="responsive"
                            />
                          </Form.Item>
                        ) : null
                      }
                    </Form.Item>
                  </div>
                </>
              )}
            </Form>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TagPermissionModal;
