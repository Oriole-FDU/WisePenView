import { toast } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';
import { FormField, Input, TextArea, UploadZone } from '@/components/base/Input';
import { useGroupService, useImageService } from '@/domains';
import type { CreateGroupRequest } from '@/domains/Group';
import { GROUP_TYPE } from '@/domains/Group';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';
import {
  assertImageProxyUploadLimit,
  IMAGE_UPLOAD_MAX_SIZE_LABEL,
} from '@/utils/image/uploadLimit';

import styles from './index.module.less';
import type { CreateGroupModalProps } from './index.type';

type CreateGroupFormValues = Omit<CreateGroupRequest, 'groupCoverUrl'> & {
  cover?: File | null;
};

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
  const [formValues, setFormValues] = useState<CreateGroupFormValues>(DEFAULT_FORM_VALUES);

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

  const { loading: submitting, run: runCreateGroup } = useApi(
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
        groupType: GROUP_TYPE.NORMAL,
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
    return true;
  };

  const handleConfirm = () => {
    if (!validateForm()) return;
    runCreateGroup({
      ...formValues,
      groupName: formValues.groupName.trim(),
      groupDesc: formValues.groupDesc.trim(),
      groupType: GROUP_TYPE.NORMAL,
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
          <AppButton variant="secondary" isDisabled={submitting} onPress={handleCancel}>
            {t('actions.cancel', { ns: 'common' })}
          </AppButton>
          <AppButton
            variant="primary"
            isDisabled={submitting}
            aria-busy={submitting || undefined}
            onPress={handleConfirm}
          >
            {t('actions.confirm', { ns: 'common' })}
          </AppButton>
        </>
      }
    >
      <FormField
        label={t('fields.name')}
        aria-label={t('fields.name')}
        value={formValues.groupName}
        onChange={(value) => updateFormValue('groupName', value)}
        isRequired
      >
        <Input placeholder={t('fields.namePlaceholder')} />
      </FormField>
      <FormField
        label={t('fields.description')}
        aria-label={t('fields.description')}
        value={formValues.groupDesc}
        onChange={(value) => updateFormValue('groupDesc', value)}
        isRequired
      >
        <TextArea rows={4} placeholder={t('fields.descriptionPlaceholder')} />
      </FormField>
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
