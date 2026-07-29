import { FormField, Input, TextArea } from '@/components/Input';
import type { AgentSpec } from '@/domains/Agent';
import { useTranslation } from 'react-i18next';
import SectionShell from '../../shared/SectionShell';
import SettingRow from '../../shared/SettingRow';
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
    <SectionShell id="agent-info" title={t('basic.title')} description={t('basic.description')}>
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
        <SettingRow
          title={t('basic.autoTitle')}
          description={t('basic.autoTitleDescription')}
          selected={spec.autoGenerateTitle}
          disabled={disabled}
          onChange={(value) => onSpecChange({ ...spec, autoGenerateTitle: value })}
        />
      </div>
    </SectionShell>
  );
}
