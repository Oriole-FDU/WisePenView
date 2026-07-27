import AppFormDialog from '@/components/Overlay/AppFormDialog';
import { useUserService } from '@/domains';
import type { PublishMessageDeliveryScope, PublishMessageType } from '@/domains/User';
import { parseErrorMessage } from '@/utils/error';
import { Input, Label, ListBox, Select, TextArea, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

  const { loading: submitting, run: runPublishMessage } = useRequest(
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
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
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
        <TextField
          aria-label={t('announcement.publish.titleLabel')}
          value={formValues.title}
          onChange={(value) => updateFormValue('title', value)}
          isDisabled={submitting}
          isRequired
        >
          <Label>{t('announcement.publish.titleLabel')}</Label>
          <Input placeholder={t('announcement.publish.titlePlaceholder')} autoFocus />
        </TextField>

        <div className={styles.twoColumnFields}>
          <Select
            aria-label={t('announcement.publish.typeLabel')}
            value={formValues.messageType}
            onChange={(value) => {
              if (value == null || Array.isArray(value)) return;
              updateFormValue('messageType', value as PublishMessageType);
            }}
            isDisabled={formValues.deliveryScope === 'ALL_USERS' || submitting}
            isRequired
          >
            <Label>{t('announcement.publish.typeLabel')}</Label>
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
            <Label>{t('announcement.publish.scopeLabel')}</Label>
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

        <TextField
          aria-label={t('announcement.publish.contentLabel')}
          value={formValues.content}
          onChange={(value) => updateFormValue('content', value)}
          isDisabled={submitting}
          isRequired
        >
          <Label>{t('announcement.publish.contentLabel')}</Label>
          <TextArea rows={5} placeholder={t('announcement.publish.contentPlaceholder')} />
        </TextField>

        <TextField
          aria-label={t('announcement.publish.jumpUrlLabel')}
          value={formValues.jumpUrl}
          onChange={(value) => updateFormValue('jumpUrl', value)}
          isDisabled={submitting}
        >
          <Label>{t('announcement.publish.jumpUrlLabel')}</Label>
          <Input placeholder={t('announcement.publish.jumpUrlPlaceholder')} />
        </TextField>

        {formValues.deliveryScope === 'DIRECT' ? (
          <TextField
            aria-label={t('announcement.publish.receiverLabel')}
            value={formValues.receiverUserIds}
            onChange={(value) => updateFormValue('receiverUserIds', value)}
            isDisabled={submitting}
            isRequired
          >
            <Label>{t('announcement.publish.receiverLabel')}</Label>
            <Input placeholder={t('announcement.publish.receiverPlaceholder')} />
          </TextField>
        ) : null}
      </div>
    </AppFormDialog>
  );
}

export default CreateAnnouncementModal;
