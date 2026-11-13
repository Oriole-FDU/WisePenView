import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppForm from '@/components/base/AppForm';
import ModelSelector from '@/components/business/ModelSelector';
import type { AgentSpec } from '@/domains/Agent';
import type { ChatModel } from '@/domains/ChatConfig';

import SettingsFieldGrid, {
  SettingsGridItem,
  SettingsSwitchField,
} from '../../shared/SettingsFieldGrid';
import styles from './style.module.scss';

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
    <div className={styles.groups}>
      <SettingsFieldGrid columns={1}>
        <SettingsGridItem>
          <AppForm.Row
            title={t('model.default')}
            control={
              <ModelSelector
                models={models}
                selectedId={selected?.id}
                isOpen={open}
                onOpenChange={setOpen}
                onChange={selectModel}
                disabled={disabled || models.length === 0}
              />
            }
          />
        </SettingsGridItem>
      </SettingsFieldGrid>
      <SettingsFieldGrid columns={2}>
        <SettingsSwitchField
          label={t('model.allowSwitch')}
          selected={spec.modelPolicy.allowRequestOverride}
          disabled={disabled}
          onChange={(value) =>
            onChange({
              ...spec,
              modelPolicy: { ...spec.modelPolicy, allowRequestOverride: value },
            })
          }
        />
        <SettingsSwitchField
          label={t('model.autoTitle')}
          selected={spec.autoGenerateTitle}
          disabled={disabled}
          onChange={(value) => onChange({ ...spec, autoGenerateTitle: value })}
        />
      </SettingsFieldGrid>
    </div>
  );
}
