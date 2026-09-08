import { AppButton } from '@/components/Button';
import { FormField, Input, TextArea, UploadZone } from '@/components/Input';
import AppModal from '@/components/Overlay/AppModal';
import { FEEDBACK_TYPE, useImageService, useUserService, type FeedbackType } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';
import {
  assertImageProxyUploadLimit,
  IMAGE_UPLOAD_MAX_SIZE_LABEL,
} from '@/utils/image/uploadLimit';
import { Dropdown, Label, toast, type Selection } from '@heroui/react';

import { ChevronDown } from 'lucide-react';
import { useState, type Key } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserFeedbackModalProps } from './index.type';
import styles from './style.module.less';

interface FeedbackFormValues {
  types: FeedbackType[];
  content: string;
  contact: string;
  image: File | null;
}

const DEFAULT_FORM_VALUES: FeedbackFormValues = {
  types: [],
  content: '',
  contact: '',
  image: null,
};

const FEEDBACK_TYPE_VALUES = new Set<string>(FEEDBACK_TYPE.options.map((option) => option.value));

function isFeedbackType(value: string): value is FeedbackType {
  return FEEDBACK_TYPE_VALUES.has(value);
}

function UserFeedbackModal({ isOpen, onOpenChange }: UserFeedbackModalProps) {
  const { i18n, t } = useTranslation(['shell', 'common']);
  const userService = useUserService();
  const imageService = useImageService();
  const [formValues, setFormValues] = useState<FeedbackFormValues>(DEFAULT_FORM_VALUES);

  const resetForm = () => {
    setFormValues(DEFAULT_FORM_VALUES);
  };

  const updateFormValue = <K extends keyof FeedbackFormValues>(
    key: K,
    value: FeedbackFormValues[K]
  ) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleTypeSelectionChange = (keys: Selection) => {
    if (keys === 'all') {
      updateFormValue(
        'types',
        FEEDBACK_TYPE.options.map((option) => option.value)
      );
      return;
    }

    const nextTypes = Array.from(keys)
      .map((key: Key) => String(key))
      .filter(isFeedbackType);
    updateFormValue('types', nextTypes);
  };

  const handleImageChange = (file: File | null) => {
    if (!file) {
      updateFormValue('image', null);
      return;
    }

    try {
      assertImageProxyUploadLimit(file);
      updateFormValue('image', file);
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    }
  };

  const { loading: submitting, run: runSubmitFeedback } = useApi(
    async (values: FeedbackFormValues) => {
      let imageUrl: string | undefined;
      if (values.image) {
        const uploadResult = await imageService.uploadImage({
          file: values.image,
          scene: 'PUBLIC_IMAGE_FOR_USER',
          bizTag: 'feedback',
        });
        imageUrl = uploadResult.publicUrl;
      }

      await userService.submitFeedback({
        types: values.types,
        content: values.content,
        contact: values.contact,
        imageUrl,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('feedback.success'));
        resetForm();
        onOpenChange(false);
      },
    }
  );

  const validateForm = (): boolean => {
    if (formValues.types.length === 0) {
      toast.warning(t('feedback.typeRequired'));
      return false;
    }
    if (!formValues.content.trim()) {
      toast.warning(t('feedback.contentRequired'));
      return false;
    }
    if (!formValues.contact.trim()) {
      toast.warning(t('feedback.contactRequired'));
      return false;
    }
    return true;
  };

  const handleConfirm = () => {
    if (!validateForm()) return;
    runSubmitFeedback({
      ...formValues,
      content: formValues.content.trim(),
      contact: formValues.contact.trim(),
    });
  };

  const selectedTypeLabels = formValues.types.map((type) => {
    const typeKey = FEEDBACK_TYPE.getKey(type);
    return typeKey ? t(`feedback.type.${typeKey}`) : String(type);
  });
  const selectedTypeLabel =
    selectedTypeLabels.length > 0
      ? new Intl.ListFormat(i18n.resolvedLanguage, { style: 'short', type: 'conjunction' }).format(
          selectedTypeLabels
        )
      : t('feedback.typeRequired');

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={t('feedback.title')}
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
            {t('actions.submit', { ns: 'common' })}
          </AppButton>
        </>
      }
    >
      <div className={styles.typeField}>
        <span className={styles.fieldLabel}>
          {t('feedback.typeLabel')}
          <span className={styles.requiredMark} aria-hidden="true">
            *
          </span>
        </span>
        <Dropdown>
          <Dropdown.Trigger>
            <AppButton
              variant="outline"
              className={styles.typeTrigger}
              isDisabled={submitting}
              aria-label={t('feedback.typeLabel')}
            >
              <span
                className={formValues.types.length > 0 ? styles.typeText : styles.typePlaceholder}
              >
                {selectedTypeLabel}
              </span>
              <ChevronDown size={16} aria-hidden className={styles.typeChevron} />
            </AppButton>
          </Dropdown.Trigger>
          <Dropdown.Popover className={styles.typePopover} placement="bottom start">
            <Dropdown.Menu
              aria-label={t('feedback.typeOptionsAria')}
              selectionMode="multiple"
              selectedKeys={new Set(formValues.types)}
              onSelectionChange={handleTypeSelectionChange}
              className={styles.typeList}
            >
              {FEEDBACK_TYPE.options.map((option) => (
                <Dropdown.Item
                  key={option.value}
                  id={option.value}
                  textValue={t(`feedback.type.${option.key}`)}
                >
                  <Label>{t(`feedback.type.${option.key}`)}</Label>
                  <Dropdown.ItemIndicator />
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      <FormField
        label={t('feedback.contentLabel')}
        aria-label={t('feedback.contentLabel')}
        value={formValues.content}
        onChange={(value) => updateFormValue('content', value)}
        isDisabled={submitting}
        isRequired
      >
        <TextArea rows={5} placeholder={t('feedback.contentPlaceholder')} />
      </FormField>

      <div className={styles.imageField}>
        <span className={styles.fieldLabel}>{t('feedback.imageLabel')}</span>
        <UploadZone
          file={formValues.image}
          disabled={submitting}
          accept="image/*"
          label={t('feedback.uploadLabel')}
          description={t('feedback.uploadDescription', { maxSize: IMAGE_UPLOAD_MAX_SIZE_LABEL })}
          onFileChange={handleImageChange}
        />
      </div>

      <FormField
        label={t('feedback.contactLabel')}
        aria-label={t('feedback.contactLabel')}
        value={formValues.contact}
        onChange={(value) => updateFormValue('contact', value)}
        isDisabled={submitting}
        isRequired
      >
        <Input placeholder={t('feedback.contactPlaceholder')} />
      </FormField>
    </AppModal>
  );
}

export default UserFeedbackModal;
