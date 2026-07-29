import { FormField, TextArea } from '@/components/Input';
import type { AgentSpec } from '@/domains/Agent';
import { Button, Label, NumberField, Slider } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RECOMMENDED_AGENT_MEMORY_SETTINGS } from '../../config/agentPresets';
import PresetRestoreConfirmDialog from '../../shared/PresetRestoreConfirmDialog';
import SectionShell from '../../shared/SectionShell';
import SettingRow from '../../shared/SettingRow';
import styles from './style.module.less';

interface Props {
  spec: AgentSpec;
  disabled: boolean;
  onChange: (spec: AgentSpec) => void;
}

const toScalar = (value: number | number[]) => (Array.isArray(value) ? value[0] : value);

export default function MemorySection({ spec, disabled, onChange }: Props) {
  const { t } = useTranslation('agent');
  const [more, setMore] = useState(false);
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
      <SectionShell id="memory" title={t('memory.title')} description={t('memory.description')}>
        <SettingRow
          title={t('memory.chat')}
          description={t('memory.chatDescription')}
          selected={policy.enableChatMemory}
          disabled={disabled}
          onChange={(value) => updatePolicy({ enableChatMemory: value })}
        />
        {policy.enableChatMemory ? (
          <>
            <SettingRow
              title={t('memory.persist')}
              description={t('memory.persistDescription')}
              selected={policy.enablePersistenceChatMemory}
              disabled={disabled}
              onChange={(value) => updatePolicy({ enablePersistenceChatMemory: value })}
            />
            <SettingRow
              title={t('memory.summary')}
              description={t('memory.summaryDescription')}
              selected={policy.enableChatMemorySummary}
              disabled={disabled}
              onChange={(value) => updatePolicy({ enableChatMemorySummary: value })}
            />
          </>
        ) : null}
        <SettingRow
          title={t('memory.longTerm')}
          description={t('memory.longTermDescription')}
          selected={policy.enableLongTermMemory}
          disabled={disabled}
          onChange={(value) => updatePolicy({ enableLongTermMemory: value })}
        />
        <div className={styles.moreRow}>
          <Button
            className={styles.more}
            size="sm"
            variant="ghost"
            onPress={() => setMore((value) => !value)}
          >
            {more ? t('memory.collapse') : t('memory.more')}
          </Button>
        </div>
        {more ? (
          <div className={styles.advanced}>
            <div className={styles.advancedHeader}>
              <span>{t('memory.advanced')}</span>
              <Button
                className={styles.presetButton}
                size="sm"
                variant="secondary"
                isDisabled={disabled}
                onPress={() => setRestoreOpen(true)}
              >
                {t('memory.restore')}
              </Button>
            </div>
            <div className={styles.settingGrid}>
              <div>
                <Label>
                  {t('memory.highWatermark', {
                    percent: Math.round(policy.highWatermarkRatio * 100),
                  })}
                </Label>
                <Slider
                  minValue={0.5}
                  maxValue={0.95}
                  step={0.05}
                  value={policy.highWatermarkRatio}
                  isDisabled={disabled || !policy.enableChatMemorySummary}
                  onChange={(value) => updatePolicy({ highWatermarkRatio: toScalar(value) })}
                >
                  <Slider.Track>
                    <Slider.Fill />
                    <Slider.Thumb />
                  </Slider.Track>
                </Slider>
              </div>
              <div>
                <Label>
                  {t('memory.lowWatermark', {
                    percent: Math.round(policy.lowWatermarkRatio * 100),
                  })}
                </Label>
                <Slider
                  minValue={0.1}
                  maxValue={0.8}
                  step={0.05}
                  value={policy.lowWatermarkRatio}
                  isDisabled={disabled || !policy.enableChatMemorySummary}
                  onChange={(value) => updatePolicy({ lowWatermarkRatio: toScalar(value) })}
                >
                  <Slider.Track>
                    <Slider.Fill />
                    <Slider.Thumb />
                  </Slider.Track>
                </Slider>
              </div>
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
              <div>
                <Label>
                  {t('memory.scoreThreshold', {
                    percent: Math.round(policy.longTermMemoryScoreThreshold * 100),
                  })}
                </Label>
                <div className={styles.controlLine}>
                  <Slider
                    minValue={0}
                    maxValue={1}
                    step={0.05}
                    value={policy.longTermMemoryScoreThreshold}
                    isDisabled={disabled || !policy.enableLongTermMemory}
                    onChange={(value) =>
                      updatePolicy({ longTermMemoryScoreThreshold: toScalar(value) })
                    }
                  >
                    <Slider.Track>
                      <Slider.Fill />
                      <Slider.Thumb />
                    </Slider.Track>
                  </Slider>
                </div>
              </div>
            </div>
            <FormField
              label={t('memory.summaryPrompt')}
              value={policy.summaryPrompt ?? ''}
              isDisabled={disabled || !policy.enableChatMemorySummary}
              onChange={(value) => updatePolicy({ summaryPrompt: value || undefined })}
            >
              <TextArea rows={3} placeholder={t('memory.summaryPlaceholder')} />
            </FormField>
          </div>
        ) : null}
      </SectionShell>
      <PresetRestoreConfirmDialog
        isOpen={restoreOpen}
        onOpenChange={setRestoreOpen}
        title={t('memory.restoreTitle')}
        description={t('memory.restoreDescription')}
        onConfirm={() => {
          restoreRecommendedSettings();
          setRestoreOpen(false);
        }}
      />
    </>
  );
}
