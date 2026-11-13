import { useTranslation } from 'react-i18next';

import AppForm from '@/components/base/AppForm';
import { FormField, Input, TextArea } from '@/components/base/Input';

import styles from './style.module.scss';

interface Props {
  name: string;
  description: string;
  disabled: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export default function BasicInfoSection({
  name,
  description,
  disabled,
  onNameChange,
  onDescriptionChange,
}: Props) {
  const { t } = useTranslation('agent');

  return (
    <AppForm.Section id="agent-info" title={t('basic.title')} variant="editor">
      <div className={styles.form}>
        <FormField
          label={t('basic.nameLabel')}
          value={name}
          isDisabled={disabled}
          onChange={onNameChange}
        >
          <Input maxLength={64} placeholder="course_research_assistant" />
        </FormField>
        <FormField
          label={t('basic.descriptionLabel')}
          value={description}
          isDisabled={disabled}
          onChange={onDescriptionChange}
        >
          <TextArea maxLength={500} rows={4} placeholder={t('basic.descriptionPlaceholder')} />
        </FormField>
      </div>
    </AppForm.Section>
  );
}
