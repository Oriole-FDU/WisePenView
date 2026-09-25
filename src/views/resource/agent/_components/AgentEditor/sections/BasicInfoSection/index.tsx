import { useTranslation } from 'react-i18next';

import AppForm from '@/components/base/AppForm';
import { FormField, Input, TextArea } from '@/components/base/Input';
import type { AgentSpec } from '@/domains/Agent';

import styles from './style.module.less';

interface Props {
  name: string;
  description: string;
  spec: AgentSpec;
  disabled: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSpecChange: (spec: AgentSpec) => void;
}

export default function BasicInfoSection({
  name,
  description,
  spec,
  disabled,
  onNameChange,
  onDescriptionChange,
  onSpecChange,
}: Props) {
  const { t } = useTranslation('agent');

  return (
    <AppForm.Section
      id="agent-info"
      title={t('basic.title')}
      description={t('basic.description')}
      variant="editor"
    >
      <div className={styles.form}>
        <FormField
          label="name"
          description={t('basic.nameHint')}
          value={name}
          isDisabled={disabled}
          onChange={onNameChange}
        >
          <Input maxLength={64} placeholder="course_research_assistant" />
        </FormField>
        <FormField
          label="description"
          description={t('basic.descriptionHint')}
          value={description}
          isDisabled={disabled}
          onChange={onDescriptionChange}
        >
          <TextArea maxLength={500} rows={4} placeholder={t('basic.descriptionPlaceholder')} />
        </FormField>
        <AppForm.Row
          title={t('basic.autoTitle')}
          description={t('basic.autoTitleDescription')}
          selected={spec.autoGenerateTitle}
          disabled={disabled}
          onChange={(value) => onSpecChange({ ...spec, autoGenerateTitle: value })}
        />
      </div>
    </AppForm.Section>
  );
}
