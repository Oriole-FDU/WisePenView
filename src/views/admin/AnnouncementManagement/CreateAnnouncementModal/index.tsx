import { ListBox, toast } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormField, Input, Select, TextArea } from '@/components/base/Input';
import AppFormDialog from '@/components/business/AppFormDialog';
import { useUserService } from '@/domains';
import type { PublishMessageDeliveryScope, PublishMessageType } from '@/domains/User';
import { useApi } from '@/hooks/useApi';

import styles from './style.module.less';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface AnnouncementFormValues {
  title: string;
  messageType: PublishMessageType;
  deliveryScope: PublishMessageDeliveryScope;
  content: string;
  jumpUrl: string;
  receiverUserIds: string;
}

const MESSAGE_TYPE_OPTIONS: Array<{ value: PublishMessageType; labelKey: string }> = [
  { value: 'SYSTEM', labelKey: 'announcement.type.SYSTEM' },
  { value: 'NORMAL', labelKey: 'announcement.type.NORMAL' },
];

const DELIVERY_SCOPE_OPTIONS: Array<{
  value: PublishMessageDeliveryScope;
  labelKey: string;
}> = [
  { value: 'ALL_USERS', labelKey: 'announcement.scope.ALL_USERS' },
  { value: 'DIRECT', labelKey: 'announcement.scope.DIRECT' },
];

const INITIAL_FORM_VALUES: AnnouncementFormValues = {
  title: '',
  messageType: 'SYSTEM',
  deliveryScope: 'ALL_USERS',
  content: '',
  jumpUrl: '',
  receiverUserIds: '',
};

const parseReceiverUserIds = (value: string): string[] =>
  value
    .replace(/[\uFF0C\uFF1B]/g, ',')
    .split(/[,\s;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

function CreateAnnouncementModal({
  isOpen,
  onOpenChange,
  onSuccess,
}: CreateAnnouncementModalProps) {
  const { t } = useTranslation(['admin', 'common']);
  const userService = useUserService();
  const [formValues, setFormValues] = useState<AnnouncementFormValues>(INITIAL_FORM_VALUES);

  function updateFormValue<K extends keyof AnnouncementFormValues>(
    field: K,
    value: AnnouncementFormValues[K]
  ) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  const reset = () => {
    setFormValues(INITIAL_FORM_VALUES);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  };

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  const { loading: submitting, run: runPublishMessage } = useApi(
    async (values: AnnouncementFormValues) => {
      const receiverUserIds = parseReceiverUserIds(values.receiverUserIds);
      await userService.publishMessage({
        deliveryScope: values.deliveryScope,
        messageType: values.deliveryScope === 'ALL_USERS' ? 'SYSTEM' : values.messageType,
        title: values.title,
        content: values.content,
        jumpUrl: values.jumpUrl,
        receiverUserIds,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('announcement.publish.success'));
        reset();
        onOpenChange(false);
        onSuccess?.();
      },
    }
  );

  const handleSubmit = () => {
    if (!formValues.title.trim()) {
      toast.warning(t('announcement.publish.titleRequired'));
      return;
    }

    if (!formValues.content.trim()) {
      toast.warning(t('announcement.publish.contentRequired'));
      return;
    }

    if (
      formValues.deliveryScope === 'DIRECT' &&
      parseReceiverUserIds(formValues.receiverUserIds).length === 0
    ) {
      toast.warning(t('announcement.publish.receiverRequired'));
      return;
    }

    runPublishMessage(formValues);
  };

  const canSubmit = Boolean(
    formValues.title.trim() &&
    formValues.content.trim() &&
    (formValues.deliveryScope === 'ALL_USERS' || formValues.receiverUserIds.trim())
  );

  return (
    <AppFormDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={t('announcement.publish.title')}
      confirmText={t('announcement.publish.action')}
      cancelText={t('actions.cancel', { ns: 'common' })}
      onCancel={handleCancel}
      onSubmit={handleSubmit}
      isSubmitting={submitting}
      isSubmitDisabled={!canSubmit}
      isDismissable={!submitting}
      size="md"
      placement="center"
    >
      <div className={styles.form}>
        <FormField
          label={t('announcement.publish.titleLabel')}
          aria-label={t('announcement.publish.titleLabel')}
          value={formValues.title}
          onChange={(value) => updateFormValue('title', value)}
          isDisabled={submitting}
          isRequired
        >
          <Input placeholder={t('announcement.publish.titlePlaceholder')} autoFocus />
        </FormField>

        <div className={styles.twoColumnFields}>
          <Select
            label={t('announcement.publish.typeLabel')}
            aria-label={t('announcement.publish.typeLabel')}
            value={formValues.messageType}
            onChange={(value) => {
              if (value == null || Array.isArray(value)) return;
              updateFormValue('messageType', value as PublishMessageType);
            }}
            isDisabled={formValues.deliveryScope === 'ALL_USERS' || submitting}
            isRequired
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {MESSAGE_TYPE_OPTIONS.map((option) => (
                  <ListBox.Item key={option.value} id={option.value} textValue={t(option.labelKey)}>
                    {t(option.labelKey)}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <Select
            label={t('announcement.publish.scopeLabel')}
            aria-label={t('announcement.publish.scopeLabel')}
            value={formValues.deliveryScope}
            onChange={(value) => {
              if (value == null || Array.isArray(value)) return;
              const nextScope = value as PublishMessageDeliveryScope;
              updateFormValue('deliveryScope', nextScope);
              if (nextScope === 'ALL_USERS') {
                updateFormValue('messageType', 'SYSTEM');
              }
            }}
            isDisabled={submitting}
            isRequired
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {DELIVERY_SCOPE_OPTIONS.map((option) => (
                  <ListBox.Item key={option.value} id={option.value} textValue={t(option.labelKey)}>
                    {t(option.labelKey)}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        <FormField
          label={t('announcement.publish.contentLabel')}
          aria-label={t('announcement.publish.contentLabel')}
          value={formValues.content}
          onChange={(value) => updateFormValue('content', value)}
          isDisabled={submitting}
          isRequired
        >
          <TextArea rows={5} placeholder={t('announcement.publish.contentPlaceholder')} />
        </FormField>

        <FormField
          label={t('announcement.publish.jumpUrlLabel')}
          aria-label={t('announcement.publish.jumpUrlLabel')}
          value={formValues.jumpUrl}
          onChange={(value) => updateFormValue('jumpUrl', value)}
          isDisabled={submitting}
        >
          <Input placeholder={t('announcement.publish.jumpUrlPlaceholder')} />
        </FormField>

        {formValues.deliveryScope === 'DIRECT' ? (
          <FormField
            label={t('announcement.publish.receiverLabel')}
            aria-label={t('announcement.publish.receiverLabel')}
            value={formValues.receiverUserIds}
            onChange={(value) => updateFormValue('receiverUserIds', value)}
            isDisabled={submitting}
            isRequired
          >
            <Input placeholder={t('announcement.publish.receiverPlaceholder')} />
          </FormField>
        ) : null}
      </div>
    </AppFormDialog>
  );
}

export default CreateAnnouncementModal;
