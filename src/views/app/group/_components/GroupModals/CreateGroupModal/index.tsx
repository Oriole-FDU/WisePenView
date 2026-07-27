import { Input, Select, TextArea } from '@/components/Input';
import AppModal from '@/components/Overlay/AppModal';
import UploadZone from '@/components/UploadZone';
import { useGroupService, useImageService, useUserService } from '@/domains';
import type { CreateGroupRequest } from '@/domains/Group';
import { ALLOWED_GROUP_TYPES_MAP, GROUP_TYPE } from '@/domains/Group';
import { IDENTITY } from '@/domains/User';
import { parseErrorMessage } from '@/utils/error';
import {
  assertImageProxyUploadLimit,
  IMAGE_UPLOAD_MAX_SIZE_LABEL,
} from '@/utils/image/uploadLimit';
import { Button, Label, ListBox, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreateGroupModalProps } from './index.type';

import styles from './index.module.less';

type CreateGroupFormValues = Omit<CreateGroupRequest, 'groupCoverUrl'> & {
  cover?: File | null;
};

const groupTypeOptionsBase = GROUP_TYPE.options;

const GROUP_TYPE_LABEL_KEYS = {
  NORMAL: 'type.normal',
  ADVANCED: 'type.advanced',
  PUBLIC: 'type.public',
} as const;

const DEFAULT_FORM_VALUES: CreateGroupFormValues = {
  groupName: '',
  groupDesc: '',
  groupType: GROUP_TYPE.NORMAL,
  cover: null,
};

function CreateGroupModal({ isOpen, onOpenChange, onSuccess }: CreateGroupModalProps) {
  const { t } = useTranslation(['group', 'common']);
  const groupService = useGroupService();
  const imageService = useImageService();
  const userService = useUserService();
  const [formValues, setFormValues] = useState<CreateGroupFormValues>(DEFAULT_FORM_VALUES);
  const [identityType, setIdentityType] = useState<number | undefined>();

  useRequest(() => userService.getUserInfo(), {
    onSuccess: (u) => {
      setIdentityType(u.identityType);
    },
  });

  const isStudent = identityType === IDENTITY.STUDENT;
  const allowedGroupTypes = ALLOWED_GROUP_TYPES_MAP[identityType ?? 3];
  const groupTypeOptions = groupTypeOptionsBase.filter((opt) =>
    allowedGroupTypes.includes(opt.value)
  );

  const resetForm = () => {
    setFormValues(DEFAULT_FORM_VALUES);
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const updateFormValue = <K extends keyof CreateGroupFormValues>(
    key: K,
    value: CreateGroupFormValues[K]
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

  const { loading: submitting, run: runCreateGroup } = useRequest(
    async (values: CreateGroupFormValues) => {
      let groupCoverUrl = '';
      if (values.cover) {
        const { publicUrl } = await imageService.uploadImage({
          file: values.cover,
          scene: 'PUBLIC_IMAGE_FOR_GROUP',
          bizTag: 'groups',
        });
        groupCoverUrl = publicUrl;
      }
      const groupId = await groupService.createGroup({
        groupName: values.groupName,
        groupType: isStudent ? GROUP_TYPE.NORMAL : values.groupType,
        groupDesc: values.groupDesc,
        groupCoverUrl,
      });
      if (groupId) toast.success(t('create.success'));
    },
    {
      manual: true,
      onSuccess: () => {
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (err: unknown) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const validateForm = (): boolean => {
    if (!formValues.groupName.trim()) {
      toast.warning(t('create.nameRequired'));
      return false;
    }
    if (!formValues.groupDesc.trim()) {
      toast.warning(t('create.descriptionRequired'));
      return false;
    }
    if (!isStudent && !formValues.groupType) {
      toast.warning(t('create.typeRequired'));
      return false;
    }
    return true;
  };

  const handleConfirm = () => {
    if (!validateForm()) return;
    const groupType = isStudent ? GROUP_TYPE.NORMAL : formValues.groupType;
    if (groupType == null) {
      toast.warning(t('create.typeRequired'));
      return;
    }
    runCreateGroup({
      ...formValues,
      groupName: formValues.groupName.trim(),
      groupDesc: formValues.groupDesc.trim(),
      groupType,
    });
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('create.title')}
      size="md"
      bodyClassName={styles.modalBody}
      isDismissable={!submitting}
      actions={
        <>
          <Button variant="secondary" isDisabled={submitting} onPress={handleCancel}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button
            variant="primary"
            isDisabled={submitting}
            aria-busy={submitting || undefined}
            onPress={handleConfirm}
          >
            {t('actions.confirm', { ns: 'common' })}
          </Button>
        </>
      }
    >
      <TextField
        aria-label={t('fields.name')}
        value={formValues.groupName}
        onChange={(value) => updateFormValue('groupName', value)}
        isRequired
      >
        <Label>{t('fields.name')}</Label>
        <Input placeholder={t('fields.namePlaceholder')} />
      </TextField>
      <TextField
        aria-label={t('fields.description')}
        value={formValues.groupDesc}
        onChange={(value) => updateFormValue('groupDesc', value)}
        isRequired
      >
        <Label>{t('fields.description')}</Label>
        <TextArea rows={4} placeholder={t('fields.descriptionPlaceholder')} />
      </TextField>
      {!isStudent && (
        <Select
          aria-label={t('fields.type')}
          name="groupType"
          value={String(formValues.groupType)}
          onChange={(value) => updateFormValue('groupType', Number(value))}
          isRequired
        >
          <Label>{t('fields.type')}</Label>
          <Select.Trigger />
          <Select.Popover>
            <ListBox>
              {groupTypeOptions.map((opt) => (
                <ListBox.Item key={String(opt.value)} id={String(opt.value)}>
                  {t(GROUP_TYPE_LABEL_KEYS[opt.key])}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      )}
      <div className={styles.coverField}>
        <span className={styles.fieldLabel}>{t('fields.cover')}</span>
        <UploadZone
          file={formValues.cover ?? null}
          disabled={submitting}
          accept="image/*"
          label={t('fields.coverUpload')}
          description={t('fields.coverUploadLimit', { size: IMAGE_UPLOAD_MAX_SIZE_LABEL })}
          onFileChange={handleCoverChange}
        />
      </div>
    </AppModal>
  );
}

export default CreateGroupModal;
