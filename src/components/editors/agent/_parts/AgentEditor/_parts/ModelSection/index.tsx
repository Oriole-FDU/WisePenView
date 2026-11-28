import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppForm from '@/components/base/AppForm';
import ModelSelector from '@/components/business/ModelSelector';
import type { AgentSpec } from '@/domains/Agent';
import type { ChatModel } from '@/domains/ChatConfig';

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
    <AppForm.Section id="model" title={t('model.title')} variant="editor">
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
      <AppForm.Row
        title={t('model.allowSwitch')}
        selected={spec.modelPolicy.allowRequestOverride}
        disabled={disabled}
        onChange={(value) =>
          onChange({
            ...spec,
            modelPolicy: { ...spec.modelPolicy, allowRequestOverride: value },
          })
        }
      />
    </AppForm.Section>
  );
}
