import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppForm from '@/components/base/AppForm';
import { AppButton } from '@/components/base/Button';
import { FormField, TextArea } from '@/components/base/Input';
import AppAlertDialog from '@/components/business/AppAlertDialog';

import { buildInstructionTemplate } from './instructionTemplate';
import styles from './style.module.scss';

interface Props {
  markdown: string;
  disabled: boolean;
  onMarkdownChange: (value: string) => void;
}

export default function SystemPromptSection({ markdown, disabled, onMarkdownChange }: Props) {
  const { t } = useTranslation('agent');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const insertTemplate = () => {
    onMarkdownChange(buildInstructionTemplate());
    setConfirmOpen(false);
  };
  const requestTemplate = () => {
    if (markdown.trim()) {
      setConfirmOpen(true);
      return;
    }
    insertTemplate();
  };

  return (
    <>
      <AppForm.Section
        id="prompt"
        title={t('prompt.title')}
        variant="editor"
        actions={
          <AppButton size="sm" variant="secondary" isDisabled={disabled} onPress={requestTemplate}>
            {t('prompt.useTemplate')}
          </AppButton>
        }
      >
        <FormField
          label={t('prompt.label')}
          value={markdown}
          isDisabled={disabled}
          onChange={onMarkdownChange}
        >
          <TextArea className={styles.markdown} rows={18} placeholder={t('prompt.placeholder')} />
        </FormField>
      </AppForm.Section>
      <AppAlertDialog
        type="warning"
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('prompt.templateConfirmTitle')}
        description={t('prompt.templateConfirmDescription')}
        cancelText={t('common:actions.cancel')}
        confirmText={t('prompt.replaceWithTemplate')}
        onConfirm={insertTemplate}
      />
    </>
  );
}
