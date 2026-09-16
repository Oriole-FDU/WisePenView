import { ListBox, Switch } from '@heroui/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import { FormField, Input, Select } from '@/components/base/Input';
import AppAlertDialog from '@/components/business/AppAlertDialog';
import AppFormDialog from '@/components/business/AppFormDialog';
import { useChatService } from '@/domains';
import type { ChatModelConfig, ChatModelFamily } from '@/domains/Chat';
import { useApi } from '@/hooks/useApi';

import styles from './style.module.less';

const MODEL_FAMILIES: ChatModelFamily[] = ['GENERIC', 'GPT', 'QWEN', 'CLAUDE', 'GEMINI'];

interface ModelFormState {
  displayName: string;
  modelFamily: ChatModelFamily;
  supportThinking: boolean;
  supportVision: boolean;
  contextWindowTokens: string;
  maxOutputTokens: string;
}

function createDefaultModelForm(): ModelFormState {
  return {
    displayName: '',
    modelFamily: 'GENERIC',
    supportThinking: false,
    supportVision: false,
    contextWindowTokens: '',
    maxOutputTokens: '',
  };
}

function parseOptionalPositiveInteger(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isValidOptionalPositiveInteger(value: string): boolean {
  return !value.trim() || parseOptionalPositiveInteger(value) != null;
}

function ModelSettingsSection() {
  const { t } = useTranslation('profile');
  const chatService = useChatService();
  const [models, setModels] = useState<ChatModelConfig[]>([]);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ChatModelConfig | null>(null);
  const [deleteModel, setDeleteModel] = useState<ChatModelConfig | null>(null);
  const [modelForm, setModelForm] = useState<ModelFormState>(createDefaultModelForm);

  const { loading, runAsync: reload } = useApi(() => chatService.getUserModels(), {
    onSuccess: setModels,
  });
  const { loading: savingModel, runAsync: saveModel } = useApi(
    (form: ModelFormState) =>
      editingModel
        ? chatService.updateUserModel({
            modelId: editingModel.id,
            displayName: form.displayName,
            modelFamily: form.modelFamily,
            supportThinking: form.supportThinking,
            supportVision: form.supportVision,
            contextWindowTokens: parseOptionalPositiveInteger(form.contextWindowTokens),
            maxOutputTokens: parseOptionalPositiveInteger(form.maxOutputTokens),
          })
        : chatService.createUserModel({
            displayName: form.displayName,
            modelFamily: form.modelFamily,
            supportThinking: form.supportThinking,
            supportVision: form.supportVision,
            contextWindowTokens: parseOptionalPositiveInteger(form.contextWindowTokens),
            maxOutputTokens: parseOptionalPositiveInteger(form.maxOutputTokens),
          }),
    {
      manual: true,
      onSuccess: () => {
        setModelDialogOpen(false);
        void reload();
      },
    }
  );
  const { loading: deletingModel, runAsync: removeModel } = useApi(
    (modelId: string) => chatService.deleteUserModel(modelId),
    {
      manual: true,
      onSuccess: () => {
        setDeleteModel(null);
        void reload();
      },
    }
  );
  const openCreate = () => {
    setEditingModel(null);
    setModelForm(createDefaultModelForm());
    setModelDialogOpen(true);
  };

  const openEdit = (model: ChatModelConfig) => {
    setEditingModel(model);
    setModelForm({
      displayName: model.displayName,
      modelFamily: model.modelFamily,
      supportThinking: model.supportThinking,
      supportVision: model.supportVision,
      contextWindowTokens: model.contextWindowTokens?.toString() ?? '',
      maxOutputTokens: model.maxOutputTokens?.toString() ?? '',
    });
    setModelDialogOpen(true);
  };

  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>{t('ai.models.title')}</h2>
            <p>{t('ai.models.description')}</p>
          </div>
          <AppButton size="sm" variant="primary" onPress={openCreate}>
            <Plus size={16} aria-hidden="true" />
            {t('ai.models.add')}
          </AppButton>
        </div>
        {loading ? <div className={styles.empty}>{t('ai.loading')}</div> : null}
        {!loading && models.length === 0 ? (
          <div className={styles.empty}>{t('ai.models.empty')}</div>
        ) : null}
        <div className={styles.rows}>
          {models.map((model) => (
            <div className={styles.modelRow} key={model.id}>
              <div className={styles.rowCopy}>
                <strong>{model.displayName}</strong>
                <span>{t(`ai.modelFamily.${model.modelFamily}`)}</span>
              </div>
              <div className={styles.rowActions}>
                <AppButton size="sm" variant="ghost" onPress={() => openEdit(model)}>
                  <Pencil size={15} aria-hidden="true" />
                  {t('ai.actions.edit')}
                </AppButton>
                <AppButton size="sm" variant="ghost" onPress={() => setDeleteModel(model)}>
                  <Trash2 size={15} aria-hidden="true" />
                  {t('ai.actions.delete')}
                </AppButton>
              </div>
            </div>
          ))}
        </div>
      </section>

      <AppFormDialog
        isOpen={modelDialogOpen}
        onOpenChange={setModelDialogOpen}
        title={editingModel ? t('ai.models.editTitle') : t('ai.models.addTitle')}
        description={t('ai.models.formDescription')}
        confirmText={t('ai.actions.save')}
        isSubmitting={savingModel}
        isSubmitDisabled={
          !modelForm.displayName.trim() ||
          !isValidOptionalPositiveInteger(modelForm.contextWindowTokens) ||
          !isValidOptionalPositiveInteger(modelForm.maxOutputTokens)
        }
        onSubmit={() => void saveModel({ ...modelForm, displayName: modelForm.displayName.trim() })}
      >
        <div className={styles.formFields}>
          <FormField
            label={t('ai.models.name')}
            value={modelForm.displayName}
            onChange={(displayName) => setModelForm((current) => ({ ...current, displayName }))}
            isRequired
          >
            <Input placeholder={t('ai.models.namePlaceholder')} autoFocus />
          </FormField>
          <Select
            label={t('ai.models.family')}
            value={modelForm.modelFamily}
            onChange={(value) => {
              if (typeof value === 'string') {
                setModelForm((current) => ({
                  ...current,
                  modelFamily: value as ChatModelFamily,
                }));
              }
            }}
            isRequired
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {MODEL_FAMILIES.map((family) => (
                  <ListBox.Item key={family} id={family} textValue={t(`ai.modelFamily.${family}`)}>
                    {t(`ai.modelFamily.${family}`)}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <div className={styles.switchGrid}>
            <Switch
              size="md"
              isSelected={modelForm.supportThinking}
              aria-label={t('ai.models.supportThinking')}
              onChange={(supportThinking) =>
                setModelForm((current) => ({ ...current, supportThinking }))
              }
            >
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <span>{t('ai.models.supportThinking')}</span>
              </Switch.Content>
            </Switch>
            <Switch
              size="md"
              isSelected={modelForm.supportVision}
              aria-label={t('ai.models.supportVision')}
              onChange={(supportVision) =>
                setModelForm((current) => ({ ...current, supportVision }))
              }
            >
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <span>{t('ai.models.supportVision')}</span>
              </Switch.Content>
            </Switch>
          </div>
          <FormField
            label={t('ai.models.contextWindowTokens')}
            description={t('ai.models.contextWindowTokensHint')}
            value={modelForm.contextWindowTokens}
            onChange={(contextWindowTokens) =>
              setModelForm((current) => ({ ...current, contextWindowTokens }))
            }
            isInvalid={!isValidOptionalPositiveInteger(modelForm.contextWindowTokens)}
          >
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              placeholder={t('ai.models.contextWindowTokensPlaceholder')}
            />
          </FormField>
          <FormField
            label={t('ai.models.maxOutputTokens')}
            description={t('ai.models.maxOutputTokensHint')}
            value={modelForm.maxOutputTokens}
            onChange={(maxOutputTokens) =>
              setModelForm((current) => ({ ...current, maxOutputTokens }))
            }
            isInvalid={!isValidOptionalPositiveInteger(modelForm.maxOutputTokens)}
          >
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              placeholder={t('ai.models.maxOutputTokensPlaceholder')}
            />
          </FormField>
          <p className={styles.capabilityNote}>{t('ai.models.streamingUnsupported')}</p>
        </div>
      </AppFormDialog>

      <AppAlertDialog
        isOpen={deleteModel != null}
        onOpenChange={(open) => !open && setDeleteModel(null)}
        type="danger"
        title={t('ai.models.deleteTitle')}
        description={t('ai.models.deleteDescription', { name: deleteModel?.displayName })}
        confirmText={t('ai.actions.delete')}
        isConfirmLoading={deletingModel}
        onConfirm={() => {
          if (deleteModel) void removeModel(deleteModel.id);
        }}
      />
    </>
  );
}

export default ModelSettingsSection;
