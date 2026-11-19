import { Label } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import { FormField, NumberField, Slider, TextArea } from '@/components/base/Input';
import AppAlertDialog from '@/components/business/AppAlertDialog';
import type { AgentSpec } from '@/domains/Agent';

import { RECOMMENDED_AGENT_MEMORY_SETTINGS } from '../../config/agentPresets';
import SettingsFieldGrid, { SettingsSwitchField } from '../../shared/SettingsFieldGrid';
import styles from './style.module.scss';

interface Props {
  spec: AgentSpec;
  disabled: boolean;
  onChange: (spec: AgentSpec) => void;
}

const toScalar = (value: number | number[]) => (Array.isArray(value) ? value[0] : value);

interface MemorySliderProps {
  label: string;
  value: number;
  minValue: number;
  maxValue: number;
  disabled: boolean;
  onChange: (value: number) => void;
}

function MemorySlider({ label, value, minValue, maxValue, disabled, onChange }: MemorySliderProps) {
  return (
    <Slider
      minValue={minValue}
      maxValue={maxValue}
      step={0.05}
      value={value}
      formatOptions={{ style: 'percent', maximumFractionDigits: 0 }}
      isDisabled={disabled}
      onChange={(nextValue) => onChange(toScalar(nextValue))}
    >
      <Label>{label}</Label>
      <Slider.Output />
      <Slider.Track>
        <Slider.Fill />
        <Slider.Thumb />
      </Slider.Track>
    </Slider>
  );
}

export default function MemorySection({ spec, disabled, onChange }: Props) {
  const { t } = useTranslation(['agent', 'common']);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const policy = spec.memoryPolicy;
  const updatePolicy = (next: Partial<typeof policy>) => {
    onChange({ ...spec, memoryPolicy: { ...policy, ...next } });
  };
  const restoreRecommendedSettings = () => {
    const recommended = RECOMMENDED_AGENT_MEMORY_SETTINGS;
    updatePolicy({
      highWatermarkRatio: recommended.highWatermarkRatio,
      lowWatermarkRatio: recommended.lowWatermarkRatio,
      summaryPrompt: recommended.summaryPrompt,
      longTermMemoryLimit: recommended.longTermMemoryLimit,
      longTermMemoryScoreThreshold: recommended.longTermMemoryScoreThreshold,
    });
  };

  return (
    <>
      <SettingsFieldGrid columns={2}>
        <SettingsSwitchField
          label={t('memory.chat')}
          selected={policy.enableChatMemory}
          disabled={disabled}
          onChange={(value) => updatePolicy({ enableChatMemory: value })}
        />
        {policy.enableChatMemory ? (
          <>
            <SettingsSwitchField
              label={t('memory.persist')}
              selected={policy.enablePersistenceChatMemory}
              disabled={disabled}
              onChange={(value) => updatePolicy({ enablePersistenceChatMemory: value })}
            />
            <SettingsSwitchField
              label={t('memory.summary')}
              selected={policy.enableChatMemorySummary}
              disabled={disabled}
              onChange={(value) => updatePolicy({ enableChatMemorySummary: value })}
            />
          </>
        ) : null}
        <SettingsSwitchField
          label={t('memory.longTerm')}
          selected={policy.enableLongTermMemory}
          disabled={disabled}
          onChange={(value) => updatePolicy({ enableLongTermMemory: value })}
        />
      </SettingsFieldGrid>
      <div className={styles.advanced}>
        <div className={styles.advancedHeader}>
          <span>{t('memory.advanced')}</span>
          <AppButton
            className={styles.presetButton}
            size="sm"
            variant="secondary"
            isDisabled={disabled}
            onPress={() => setRestoreOpen(true)}
          >
            {t('memory.restore')}
          </AppButton>
        </div>
        <div className={styles.settingGrid}>
          <MemorySlider
            label={t('memory.highWatermark')}
            value={policy.highWatermarkRatio}
            minValue={0.5}
            maxValue={0.95}
            disabled={disabled || !policy.enableChatMemorySummary}
            onChange={(value) => updatePolicy({ highWatermarkRatio: value })}
          />
          <MemorySlider
            label={t('memory.lowWatermark')}
            value={policy.lowWatermarkRatio}
            minValue={0.1}
            maxValue={0.8}
            disabled={disabled || !policy.enableChatMemorySummary}
            onChange={(value) => updatePolicy({ lowWatermarkRatio: value })}
          />
        </div>
        <div className={styles.settingGrid}>
          <NumberField
            value={policy.longTermMemoryLimit}
            minValue={1}
            maxValue={50}
            step={1}
            isDisabled={disabled || !policy.enableLongTermMemory}
            onChange={(value) => updatePolicy({ longTermMemoryLimit: Number(value) })}
          >
            <Label>{t('memory.recallLimit')}</Label>
            <div className={styles.controlLine}>
              <NumberField.Group>
                <NumberField.DecrementButton />
                <NumberField.Input />
                <NumberField.IncrementButton />
              </NumberField.Group>
            </div>
          </NumberField>
          <MemorySlider
            label={t('memory.scoreThreshold')}
            value={policy.longTermMemoryScoreThreshold}
            minValue={0}
            maxValue={1}
            disabled={disabled || !policy.enableLongTermMemory}
            onChange={(value) => updatePolicy({ longTermMemoryScoreThreshold: value })}
          />
        </div>
        <FormField
          label={t('memory.summaryPrompt')}
          value={policy.summaryPrompt}
          isDisabled={disabled || !policy.enableChatMemorySummary}
          onChange={(value) => updatePolicy({ summaryPrompt: value })}
        >
          <TextArea rows={3} placeholder={t('memory.summaryPlaceholder')} />
        </FormField>
      </div>
      <AppAlertDialog
        type="warning"
        isOpen={restoreOpen}
        onOpenChange={setRestoreOpen}
        title={t('agent:memory.restoreTitle')}
        description={t('agent:memory.restoreDescription')}
        cancelText={t('common:actions.cancel')}
        confirmText={t('agent:memory.restore')}
        onConfirm={() => {
          restoreRecommendedSettings();
          setRestoreOpen(false);
        }}
      />
    </>
  );
}
