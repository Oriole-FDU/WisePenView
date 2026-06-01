import UploadZone from '@/components/Common/UploadZone';
import { useGroupService, useImageService } from '@/domains';
import type { EditGroupRequest, GroupFileOrgLogic, GroupResConfig } from '@/domains/Group';
import { GROUP_FILE_ORG_LOGIC, GROUP_TYPE } from '@/domains/Group';
import {
  actionsToPermissionCode,
  getResourceActionImpliedActions,
  getResourceActionImpliedMask,
  hasResourceAction,
  normalizeResourceActions,
  permissionCodeToActions,
  TAG_RESOURCE_ACTION,
  type TagResourceAction,
} from '@/domains/Tag';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import {
  assertImageProxyUploadLimit,
  IMAGE_UPLOAD_MAX_SIZE_LABEL,
} from '@/utils/image/uploadLimit';
import {
  Button,
  Checkbox,
  Form,
  Input,
  Label,
  Modal,
  Radio,
  RadioGroup,
  TextArea,
  TextField,
  toast,
  Tooltip,
} from '@heroui/react';
import { useMount, useRequest, useUpdateEffect } from 'ahooks';
import { useCallback, useState } from 'react';
import type { EditGroupInfoModalProps } from './index.type';

import styles from './index.module.less';

/** 编辑小组表单值（含封面上传） */
type EditGroupFormValues = Pick<EditGroupRequest, 'groupName' | 'groupDesc'> & {
  cover?: File | null;
  fileOrgLogic?: GroupFileOrgLogic;
  defaultMemberActions?: TagResourceAction[];
};

const DEFAULT_MEMBER_ACTIONS: TagResourceAction[] = [
  TAG_RESOURCE_ACTION.DISCOVER,
  TAG_RESOURCE_ACTION.VIEW,
  TAG_RESOURCE_ACTION.DOWNLOAD_WATERMARK,
];

const FILE_ORG_LOGIC_LABEL: Record<GroupFileOrgLogic, string> = {
  [GROUP_FILE_ORG_LOGIC.FOLDER]: '文件夹',
  [GROUP_FILE_ORG_LOGIC.TAG]: '标签',
};

const FILE_ORG_LOGIC_INTRO: Record<GroupFileOrgLogic, string> = {
  [GROUP_FILE_ORG_LOGIC.FOLDER]:
    '文件夹模式：用常规文件夹模式组织资源，同一份资源只能上传到一个文件夹下。',
  [GROUP_FILE_ORG_LOGIC.TAG]: '标签模式：用标签组织资源，同一份资源可以上传到多个标签下。',
};

const buildInitialConfig = (
  config?: GroupResConfig
): Pick<EditGroupFormValues, 'fileOrgLogic' | 'defaultMemberActions'> => ({
  fileOrgLogic: config?.fileOrgLogic ?? GROUP_FILE_ORG_LOGIC.FOLDER,
  defaultMemberActions: config
    ? normalizeResourceActions(config.defaultMemberActions)
    : DEFAULT_MEMBER_ACTIONS,
});

const buildInitialFormValues = ({
  groupName,
  description,
  config,
}: {
  groupName: string;
  description: string;
  config?: GroupResConfig;
}): EditGroupFormValues => ({
  groupName,
  groupDesc: description,
  cover: null,
  ...buildInitialConfig(config),
});

function EditGroupInfoModal({
  open,
  onCancel,
  groupId,
  groupName = '',
  description = '',
  cover,
  groupType = GROUP_TYPE.NORMAL,
  onSuccess,
}: EditGroupInfoModalProps) {
  const groupService = useGroupService();
  const imageService = useImageService();
  const [formValues, setFormValues] = useState<EditGroupFormValues>(() =>
    buildInitialFormValues({
      groupName,
      description,
      config: undefined,
    })
  );
  const [hoveredAction, setHoveredAction] = useState<TagResourceAction | null>(null);

  const {
    loading: configLoading,
    data: groupResConfig,
    run: runFetchGroupResConfig,
  } = useRequest(
    async (targetGroupId: string): Promise<GroupResConfig> =>
      groupService.fetchGroupResConfig(targetGroupId),
    {
      manual: true,
      onSuccess: (config) => {
        setFormValues((prev) => ({
          ...prev,
          ...buildInitialConfig(config),
        }));
      },
      onError: (error: unknown) => {
        setFormValues((prev) => ({
          ...prev,
          ...buildInitialConfig(),
        }));
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const isTagModeLocked = groupResConfig?.fileOrgLogic === GROUP_FILE_ORG_LOGIC.TAG;

  const { loading, run: runEditGroup } = useRequest(
    async (formValues: EditGroupFormValues) => {
      if (!groupId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_ID_REQUIRED);
      }
      let groupCoverUrl = cover ?? '';
      if (formValues.cover) {
        const { publicUrl } = await imageService.uploadImage({
          file: formValues.cover,
          scene: 'PUBLIC_IMAGE_FOR_GROUP',
          bizTag: `groups/${groupId}`,
        });
        groupCoverUrl = publicUrl;
      }
      const params: EditGroupRequest = {
        groupId,
        groupName: formValues.groupName,
        groupDesc: formValues.groupDesc,
        groupCoverUrl,
        groupType,
      };
      await groupService.editGroup(params);
      await groupService.updateGroupResConfig({
        groupId,
        fileOrgLogic: isTagModeLocked
          ? GROUP_FILE_ORG_LOGIC.TAG
          : (formValues.fileOrgLogic ??
            groupResConfig?.fileOrgLogic ??
            GROUP_FILE_ORG_LOGIC.FOLDER),
        defaultMemberActions: normalizeResourceActions(
          formValues.defaultMemberActions ?? DEFAULT_MEMBER_ACTIONS
        ),
      });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('小组信息已更新');
        setFormValues(buildInitialFormValues({ groupName, description, config: groupResConfig }));
        onSuccess?.();
        onCancel();
      },
      onError: (error: unknown) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const updateFormValue = <K extends keyof EditGroupFormValues>(
    key: K,
    value: EditGroupFormValues[K]
  ) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleCoverChange = (file: File | null) => {
    if (!file) {
      updateFormValue('cover', null);
      return;
    }
    try {
      assertImageProxyUploadLimit(file);
      updateFormValue('cover', file);
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    }
  };

  const resetForm = useCallback(() => {
    setFormValues(buildInitialFormValues({ groupName, description, config: groupResConfig }));
    setHoveredAction(null);
  }, [description, groupName, groupResConfig]);

  const initForm = useCallback(() => {
    setFormValues(buildInitialFormValues({ groupName, description, config: undefined }));
    if (groupId) {
      runFetchGroupResConfig(groupId);
    }
  }, [description, groupName, groupId, runFetchGroupResConfig]);

  const handleConfirm = () => {
    if (!groupId) {
      toast.danger('小组ID不存在');
      return;
    }
    if (!formValues.groupName.trim()) {
      toast.warning('请输入小组名称');
      return;
    }
    const trimmedName = formValues.groupName.trim();
    const trimmedDesc = formValues.groupDesc?.trim() ?? '';
    runEditGroup({
      ...formValues,
      groupName: trimmedName,
      groupDesc: trimmedDesc,
    });
  };

  useMount(() => {
    if (open) {
      initForm();
    }
  });

  useUpdateEffect(() => {
    if (open) {
      initForm();
      return;
    }
    setHoveredAction(null);
  }, [open, initForm]);

  const selectedActions = normalizeResourceActions(
    formValues.defaultMemberActions ?? DEFAULT_MEMBER_ACTIONS
  );
  const selectedActionSet = new Set(selectedActions);
  const actionHighlightSet = hoveredAction
    ? new Set([hoveredAction, ...getResourceActionImpliedActions(hoveredAction)])
    : null;

  const handleActionToggle = (action: TagResourceAction, checked: boolean) => {
    const current = normalizeResourceActions(
      formValues.defaultMemberActions ?? DEFAULT_MEMBER_ACTIONS
    );
    if (checked) {
      const nextCode = actionsToPermissionCode([...current, action]);
      updateFormValue('defaultMemberActions', permissionCodeToActions(nextCode));
      return;
    }
    const next = normalizeResourceActions(
      current.filter((item) => !hasResourceAction(getResourceActionImpliedMask(item), action))
    );
    updateFormValue('defaultMemberActions', next);
  };

  return (
    <Modal
      isOpen={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetForm();
          onCancel();
        }
      }}
    >
      <Modal.Backdrop isDismissable={!loading}>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>编辑小组信息</Modal.Heading>
            </Modal.Header>
            <Form
              onSubmit={(event) => {
                event.preventDefault();
                handleConfirm();
              }}
              className={styles.modalForm}
            >
              <Modal.Body className={styles.modalBody}>
                <TextField
                  aria-label="小组名称"
                  value={formValues.groupName}
                  onChange={(value) => updateFormValue('groupName', value)}
                  isRequired
                >
                  <Label>小组名称</Label>
                  <Input placeholder="请输入小组名称" />
                </TextField>
                <TextField
                  aria-label="小组描述"
                  value={formValues.groupDesc}
                  onChange={(value) => updateFormValue('groupDesc', value)}
                >
                  <Label>小组描述</Label>
                  <TextArea rows={4} placeholder="请输入小组描述（可选）" />
                </TextField>
                <div className={styles.coverField}>
                  <span className={styles.fieldLabel}>封面图片</span>
                  <UploadZone
                    file={formValues.cover ?? null}
                    disabled={loading}
                    accept="image/*"
                    label="点击或拖拽封面图片到此区域"
                    description={`仅可选择单张图片，大小不超过 ${IMAGE_UPLOAD_MAX_SIZE_LABEL}`}
                    onFileChange={handleCoverChange}
                  />
                </div>
                <div className={styles.sectionCard}>
                  <div className={styles.sectionTitle}>资源管理模式</div>
                  <RadioGroup
                    aria-label="资源管理模式"
                    value={formValues.fileOrgLogic ?? GROUP_FILE_ORG_LOGIC.FOLDER}
                    onChange={(value) =>
                      updateFormValue('fileOrgLogic', value as GroupFileOrgLogic)
                    }
                    isDisabled={isTagModeLocked}
                    className={
                      isTagModeLocked ? `${styles.modeRow} ${styles.modeDisabled}` : styles.modeRow
                    }
                    variant="secondary"
                    orientation="horizontal"
                  >
                    {GROUP_FILE_ORG_LOGIC.options.map((item) => (
                      <Radio key={item.key} value={item.value}>
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        <Radio.Content>
                          <Tooltip>
                            <Tooltip.Trigger>
                              <span>{FILE_ORG_LOGIC_LABEL[item.value]}</span>
                            </Tooltip.Trigger>
                            <Tooltip.Content>{FILE_ORG_LOGIC_INTRO[item.value]}</Tooltip.Content>
                          </Tooltip>
                        </Radio.Content>
                      </Radio>
                    ))}
                  </RadioGroup>
                  <div className={styles.modeHint}>只能从文件夹模式切换至标签模式</div>
                </div>
                <div className={styles.sectionCard}>
                  <div className={styles.sectionTitle}>小组成员默认权限</div>
                  <div className={styles.actionGroup}>新成员默认可用的资源权限</div>
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
                            onChange={(isSelected) => handleActionToggle(action, isSelected)}
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
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  isDisabled={loading || configLoading}
                  onPress={() => {
                    resetForm();
                    onCancel();
                  }}
                >
                  取消
                </Button>
                <Button type="submit" variant="primary" isDisabled={loading || configLoading}>
                  确定
                </Button>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default EditGroupInfoModal;
