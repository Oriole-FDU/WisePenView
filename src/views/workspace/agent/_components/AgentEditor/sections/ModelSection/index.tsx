import ModelSelector from '@/components/ModelSelector';
import type { AgentSpec } from '@/domains/Agent';
import type { ChatModel } from '@/domains/Chat';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionShell from '../../shared/SectionShell';
import SettingRow from '../../shared/SettingRow';
import styles from './style.module.less';

interface Props {
  spec: AgentSpec;
  models: ChatModel[];
  disabled: boolean;
  onChange: (spec: AgentSpec) => void;
}

export default function ModelSection({ spec, models, disabled, onChange }: Props) {
  const { t } = useTranslation('agent');
  const [open, setOpen] = useState(false);
  const selected = models.find(
    (model) =>
      model.modelId === spec.modelPolicy.defaultModelId &&
      (!spec.modelPolicy.defaultProviderId ||
        model.providerId === spec.modelPolicy.defaultProviderId)
  );

  const selectModel = (model: ChatModel) => {
    onChange({
      ...spec,
      modelPolicy: {
        ...spec.modelPolicy,
        defaultModelId: model.modelId,
        defaultProviderId: model.providerId ?? '',
      },
    });
    setOpen(false);
  };

  return (
    <SectionShell id="model" title={t('model.title')} description={t('model.description')}>
      <div className={styles.modelRow}>
        <div>
          <strong>{t('model.default')}</strong>
          <span>{t('model.defaultHint')}</span>
        </div>
        <ModelSelector
          models={models}
          selectedId={selected?.id}
          isOpen={open}
          onOpenChange={setOpen}
          onChange={selectModel}
          disabled={disabled || models.length === 0}
        />
      </div>
      <SettingRow
        title={t('model.allowSwitch')}
        description={t('model.allowSwitchDescription')}
        selected={spec.modelPolicy.allowRequestOverride}
        disabled={disabled}
        onChange={(value) =>
          onChange({
            ...spec,
            modelPolicy: { ...spec.modelPolicy, allowRequestOverride: value },
          })
        }
      />
    </SectionShell>
  );
}
