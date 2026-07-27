import { FormField, TextArea } from '@/components/Input';
import { Button, Switch, Tabs } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GuidedPromptFields, SoulFieldKey } from '../../systemPrompt';
import {
  buildGuidedPrompt,
  getDefaultGuidedPromptFields,
  parseGuidedPrompt,
  setSoulEnabled,
  syncGuidedPrompt,
} from '../../systemPrompt';
import PresetRestoreConfirmDialog from '../PresetRestoreConfirmDialog';
import SectionShell from '../SectionShell';
import styles from './style.module.less';
export type PromptMode = 'guided' | 'free';
interface Props {
  markdown: string;
  mode: PromptMode;
  disabled: boolean;
  onMarkdownChange: (value: string) => void;
  onModeRequest: (mode: PromptMode) => void;
}
const textFields: Array<{
  key: keyof GuidedPromptFields;
  rows?: number;
}> = [
  { key: 'overview' },
  { key: 'context' },
  { key: 'workflow' },
  { key: 'outputFormat' },
  { key: 'exampleOutput', rows: 7 },
  { key: 'qualityChecks' },
  { key: 'whenToAsk' },
];
const soulFields: SoulFieldKey[] = [
  'soulStyle',
  'soulInitiative',
  'soulTaste',
  'soulTruth',
  'soulBoundaries',
];

export default function SystemPromptSection({
  markdown,
  mode,
  disabled,
  onMarkdownChange,
  onModeRequest,
}: Props) {
  const { t } = useTranslation('agent');
  const [restoreOpen, setRestoreOpen] = useState(false);
  const parsed = parseGuidedPrompt(markdown);
  const fields = parsed.compatible ? parsed.fields : getDefaultGuidedPromptFields();
  const update = (next: GuidedPromptFields) => onMarkdownChange(syncGuidedPrompt(markdown, next));
  return (
    <>
      <SectionShell
        id="prompt"
        title={t('prompt.title')}
        description={t('prompt.description')}
        actions={
          <Tabs
            className={styles.tabs}
            selectedKey={mode}
            onSelectionChange={(key) => {
              const nextMode = String(key);
              if (nextMode === 'guided' || nextMode === 'free') onModeRequest(nextMode);
            }}
          >
            <Tabs.ListContainer>
              <Tabs.List className={styles.tabList} aria-label={t('prompt.modeAria')}>
                <Tabs.Tab id="guided" className={styles.tab}>
                  {t('prompt.guided')}
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="free" className={styles.tab}>
                  {t('prompt.free')}
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        }
      >
        {mode === 'free' ? (
          <div>
            <div className={styles.editorHead}>
              <strong>System Prompt Markdown</strong>
              <span data-compatible={parsed.compatible}>
                {parsed.compatible ? t('prompt.compatible') : t('prompt.incompatible')}
              </span>
            </div>
            <FormField
              aria-label="System Prompt Markdown"
              value={markdown}
              isDisabled={disabled}
              onChange={onMarkdownChange}
            >
              <TextArea className={styles.markdown} />
            </FormField>
          </div>
        ) : (
          <div className={styles.guided}>
            <div className={styles.groupHead}>
              <div>
                <strong>Agent</strong>
                <p>{t('prompt.agentDescription')}</p>
              </div>
              <Button
                className={styles.presetButton}
                size="sm"
                variant="secondary"
                isDisabled={disabled}
                onPress={() => setRestoreOpen(true)}
              >
                {t('prompt.restore')}
              </Button>
            </div>
            {textFields.map((field) => (
              <div key={field.key} className={styles.promptField}>
                <FormField
                  label={t(`prompt.field.${field.key}.label`)}
                  description={t(`prompt.field.${field.key}.description`)}
                  value={String(fields[field.key])}
                  isDisabled={disabled}
                  onChange={(value) => update({ ...fields, [field.key]: value })}
                >
                  <TextArea rows={field.rows ?? 4} />
                </FormField>
              </div>
            ))}
            <div className={styles.soulHead}>
              <div>
                <strong>{t('prompt.soulTitle')}</strong>
                <p>{t('prompt.soulDescription')}</p>
              </div>
              <Switch
                size="md"
                aria-label={t('prompt.soulAria')}
                isSelected={parsed.soulEnabled}
                isDisabled={disabled}
                onChange={(selected) =>
                  onMarkdownChange(setSoulEnabled(markdown, fields, selected))
                }
              >
                <Switch.Content className={styles.switchContent}>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
            </div>
            {parsed.soulEnabled ? (
              <>
                <div className={styles.promptField}>
                  <FormField
                    label={t('prompt.field.soulRole.label')}
                    description={t('prompt.field.soulRole.description')}
                    value={fields.soulRole}
                    isDisabled={disabled}
                    onChange={(value) => update({ ...fields, soulRole: value })}
                  >
                    <TextArea rows={4} />
                  </FormField>
                </div>
                {soulFields.map((field) => (
                  <div key={field} className={styles.presetField}>
                    <FormField
                      label={t(`prompt.field.${field}.label`)}
                      description={t(`prompt.field.${field}.description`)}
                      value={fields[field]}
                      isDisabled={disabled}
                      onChange={(value) => update({ ...fields, [field]: value })}
                    >
                      <TextArea rows={3} />
                    </FormField>
                  </div>
                ))}
              </>
            ) : null}
          </div>
        )}
      </SectionShell>
      <PresetRestoreConfirmDialog
        isOpen={restoreOpen}
        onOpenChange={setRestoreOpen}
        title={t('prompt.restoreTitle')}
        description={t('prompt.restoreDescription')}
        onConfirm={() => {
          onMarkdownChange(buildGuidedPrompt(getDefaultGuidedPromptFields(), true));
          setRestoreOpen(false);
        }}
      />
    </>
  );
}
