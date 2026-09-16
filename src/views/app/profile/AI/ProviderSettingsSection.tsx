import { Chip, ListBox, Switch } from '@heroui/react';
import { Link, Link2, Plus, Settings2, Trash2, Unlink } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton, AppIconButton } from '@/components/base/Button';
import { FormField, Input, PasswordInput, Select } from '@/components/base/Input';
import AppAlertDialog from '@/components/business/AppAlertDialog';
import AppFormDialog from '@/components/business/AppFormDialog';
import { useChatService } from '@/domains';
import type { ChatModelConfig, ChatProvider, ChatProviderType } from '@/domains/Chat';
import { useApi } from '@/hooks/useApi';

import styles from './style.module.less';

const PROVIDER_TYPES: ChatProviderType[] = [
  'OPENAI',
  'ANTHROPIC',
  'GOOGLE',
  'ALIBABA',
  'OPENAI_COMPATIBLE',
];

function ProviderSettingsSection() {
  const { t } = useTranslation('profile');
  const chatService = useChatService();
  const [providers, setProviders] = useState<ChatProvider[]>([]);
  const [models, setModels] = useState<ChatModelConfig[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bindingDialogOpen, setBindingDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ChatProvider | null>(null);
  const [deleteProvider, setDeleteProvider] = useState<ChatProvider | null>(null);
  const [unbindTarget, setUnbindTarget] = useState<{
    model: ChatModelConfig;
    provider: ChatProvider;
  } | null>(null);
  const [bindingForm, setBindingForm] = useState({
    modelId: '',
    providerModelName: '',
  });
  const [form, setForm] = useState({
    name: '',
    type: 'OPENAI' as ChatProviderType,
    apiKey: '',
    baseUrl: '',
  });

  const { loading, runAsync: reload } = useApi(
    async () => {
      const [nextProviders, nextModels] = await Promise.all([
        chatService.getUserProviders(),
        chatService.getBindableModels(),
      ]);
      return { providers: nextProviders, models: nextModels };
    },
    {
      onSuccess: (data) => {
        setProviders(data.providers);
        setModels(data.models);
      },
    }
  );
  const { loading: saving, runAsync: save } = useApi(
    (params: Parameters<typeof chatService.createUserProvider>[0]) =>
      editingProvider
        ? chatService.updateUserProvider({
            providerId: editingProvider.id,
            name: params.name,
            type: params.type,
            apiKey: params.apiKey || undefined,
            baseUrl: params.baseUrl,
          })
        : chatService.createUserProvider(params),
    {
      manual: true,
      onSuccess: () => {
        setDialogOpen(false);
        void reload();
      },
    }
  );
  const { loading: toggling, runAsync: toggle } = useApi(
    async (provider: ChatProvider, isActive: boolean) => {
      await chatService.updateUserProvider({ providerId: provider.id, isActive });
      return { providerId: provider.id, isActive };
    },
    {
      manual: true,
      onSuccess: ({ providerId, isActive }) => {
        setProviders((current) =>
          current.map((provider) =>
            provider.id === providerId ? { ...provider, isActive } : provider
          )
        );
      },
    }
  );
  const { loading: deleting, runAsync: remove } = useApi(
    (providerId: string) => chatService.deleteUserProvider(providerId),
    {
      manual: true,
      onSuccess: () => {
        setDeleteProvider(null);
        void reload();
      },
    }
  );
  const { loading: savingBinding, runAsync: saveBinding } = useApi(
    (params: { providerId: string; modelId: string; providerModelName: string }) =>
      chatService.bindModelProvider(params),
    {
      manual: true,
      onSuccess: () => {
        setBindingDialogOpen(false);
        void reload();
      },
    }
  );
  const { loading: unbinding, runAsync: unbind } = useApi(
    (target: { model: ChatModelConfig; provider: ChatProvider }) =>
      chatService.unbindModelProvider(target.model.id, target.provider.id),
    {
      manual: true,
      onSuccess: () => {
        setUnbindTarget(null);
        void reload();
      },
    }
  );

  const openCreate = () => {
    setEditingProvider(null);
    setForm({ name: '', type: 'OPENAI', apiKey: '', baseUrl: '' });
    setDialogOpen(true);
  };

  const openEdit = (provider: ChatProvider) => {
    setEditingProvider(provider);
    setForm({
      name: provider.name,
      type: provider.type,
      apiKey: '',
      baseUrl: provider.baseUrl ?? '',
    });
    setDialogOpen(true);
  };

  const openBinding = async (provider: ChatProvider) => {
    const data = await reload();
    if (!data || data.models.length === 0) return;

    setBindingForm({
      modelId: data.models[0].id,
      providerModelName: '',
    });
    setEditingProvider(provider);
    setBindingDialogOpen(true);
  };

  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>{t('ai.byok.title')}</h2>
            <p>{t('ai.byok.description')}</p>
          </div>
          <AppButton size="sm" variant="primary" onPress={openCreate}>
            <Plus size={16} aria-hidden="true" />
            {t('ai.byok.add')}
          </AppButton>
        </div>
        {loading ? <div className={styles.empty}>{t('ai.loading')}</div> : null}
        {!loading && providers.length === 0 ? (
          <div className={styles.empty}>{t('ai.byok.empty')}</div>
        ) : null}
        <div className={styles.rows}>
          {providers.map((provider) => (
            <div className={styles.row} key={provider.id}>
              <div className={styles.rowCopy}>
                <strong>{provider.name}</strong>
                <span>
                  {t(`ai.providerType.${provider.type}`)} ·{' '}
                  {provider.apiKeyFingerprint || t('ai.emptyValue')}
                </span>
                {provider.baseUrl ? <small>{provider.baseUrl}</small> : null}
                <div className={styles.mappingList}>
                  {models.flatMap((model) =>
                    model.mappings
                      .filter((mapping) => mapping.providerId === provider.id)
                      .map((mapping) => (
                        <div
                          key={`${model.id}:${mapping.providerId}`}
                          className={styles.mappingItem}
                        >
                          <Chip
                            size="sm"
                            variant="soft"
                            className={styles.mappingChip}
                            title={`${model.displayName} · ${mapping.providerModelName}`}
                          >
                            <Link2
                              size={13}
                              aria-hidden="true"
                              className={styles.mappingChipIcon}
                            />
                            <Chip.Label className={styles.mappingChipLabel}>
                              {model.displayName} · {mapping.providerModelName}
                            </Chip.Label>
                          </Chip>
                          <AppIconButton
                            icon={<Unlink size={13} aria-hidden="true" />}
                            size="sm"
                            className={styles.unlinkButton}
                            label={t('ai.models.unbindAria', { name: model.displayName })}
                            onClick={() => setUnbindTarget({ model, provider })}
                          />
                        </div>
                      ))
                  )}
                  {models.every(
                    (model) => !model.mappings.some((mapping) => mapping.providerId === provider.id)
                  ) ? (
                    <span className={styles.unbound}>{t('ai.models.unbound')}</span>
                  ) : null}
                </div>
              </div>
              <div className={styles.rowActions}>
                <Switch
                  size="md"
                  isSelected={provider.isActive}
                  isDisabled={toggling}
                  aria-label={t('ai.byok.enableAria', { name: provider.name })}
                  onChange={(isActive) => void toggle(provider, isActive)}
                >
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
                <AppButton size="sm" variant="ghost" onPress={() => openEdit(provider)}>
                  <Settings2 size={15} aria-hidden="true" />
                  {t('ai.actions.edit')}
                </AppButton>
                <AppButton
                  size="sm"
                  variant="ghost"
                  isDisabled={loading}
                  onPress={() => void openBinding(provider)}
                >
                  <Link size={15} aria-hidden="true" />
                  {t('ai.models.bind')}
                </AppButton>
                <AppButton size="sm" variant="ghost" onPress={() => setDeleteProvider(provider)}>
                  <Trash2 size={15} aria-hidden="true" />
                  {t('ai.actions.delete')}
                </AppButton>
              </div>
            </div>
          ))}
        </div>
      </section>

      <AppFormDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingProvider ? t('ai.byok.editTitle') : t('ai.byok.addTitle')}
        description={t('ai.byok.formDescription')}
        confirmText={t('ai.actions.save')}
        isSubmitting={saving}
        isSubmitDisabled={!form.name.trim() || (!editingProvider && !form.apiKey.trim())}
        onSubmit={() => {
          void save({
            name: form.name.trim(),
            type: form.type,
            apiKey: form.apiKey.trim(),
            baseUrl: form.baseUrl.trim() || null,
          });
        }}
      >
        <div className={styles.formFields}>
          <FormField
            label={t('ai.byok.name')}
            value={form.name}
            onChange={(name) => setForm((current) => ({ ...current, name }))}
            isRequired
          >
            <Input placeholder={t('ai.byok.namePlaceholder')} autoFocus />
          </FormField>
          <Select
            label={t('ai.byok.type')}
            value={form.type}
            onChange={(value) => {
              if (typeof value === 'string') {
                setForm((current) => ({ ...current, type: value as ChatProviderType }));
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
                {PROVIDER_TYPES.map((type) => (
                  <ListBox.Item key={type} id={type} textValue={t(`ai.providerType.${type}`)}>
                    {t(`ai.providerType.${type}`)}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <FormField
            label={t('ai.byok.apiKey')}
            description={editingProvider ? t('ai.byok.apiKeyHint') : undefined}
            value={form.apiKey}
            onChange={(apiKey) => setForm((current) => ({ ...current, apiKey }))}
            isRequired={!editingProvider}
          >
            <PasswordInput
              placeholder={t('ai.byok.apiKeyPlaceholder')}
              showPasswordLabel={t('ai.actions.showKey')}
              hidePasswordLabel={t('ai.actions.hideKey')}
            />
          </FormField>
          <FormField
            label={t('ai.byok.baseUrl')}
            description={t('ai.byok.baseUrlHint')}
            value={form.baseUrl}
            onChange={(baseUrl) => setForm((current) => ({ ...current, baseUrl }))}
          >
            <Input placeholder="https://api.example.com/v1" />
          </FormField>
        </div>
      </AppFormDialog>

      <AppFormDialog
        isOpen={bindingDialogOpen}
        onOpenChange={setBindingDialogOpen}
        title={t('ai.models.bindTitle')}
        description={t('ai.models.bindDescription')}
        confirmText={t('ai.models.bind')}
        isSubmitting={savingBinding}
        isSubmitDisabled={!bindingForm.modelId || !bindingForm.providerModelName.trim()}
        onSubmit={() => {
          if (editingProvider) {
            void saveBinding({
              providerId: editingProvider.id,
              modelId: bindingForm.modelId,
              providerModelName: bindingForm.providerModelName.trim(),
            });
          }
        }}
      >
        <div className={styles.formFields}>
          <Select
            label={t('ai.models.name')}
            value={bindingForm.modelId}
            onChange={(value) => {
              if (typeof value === 'string') {
                setBindingForm((current) => ({ ...current, modelId: value }));
              }
            }}
            isRequired
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover className={styles.bindModelSelectPopover}>
              <ListBox>
                {models.map((model) => {
                  const scopeLabel = t(`ai.models.scope.${model.scope}`);
                  return (
                    <ListBox.Item
                      key={model.id}
                      id={model.id}
                      textValue={`${model.displayName} ${scopeLabel}`}
                    >
                      {model.displayName} · {scopeLabel}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  );
                })}
              </ListBox>
            </Select.Popover>
          </Select>
          <FormField
            label={t('ai.models.providerModelName')}
            value={bindingForm.providerModelName}
            onChange={(providerModelName) =>
              setBindingForm((current) => ({ ...current, providerModelName }))
            }
            isRequired
          >
            <Input placeholder={t('ai.models.providerModelNamePlaceholder')} autoFocus />
          </FormField>
        </div>
      </AppFormDialog>

      <AppAlertDialog
        isOpen={deleteProvider != null}
        onOpenChange={(open) => !open && setDeleteProvider(null)}
        type="danger"
        title={t('ai.byok.deleteTitle')}
        description={t('ai.byok.deleteDescription', { name: deleteProvider?.name })}
        confirmText={t('ai.actions.delete')}
        isConfirmLoading={deleting}
        onConfirm={() => {
          if (deleteProvider) void remove(deleteProvider.id);
        }}
      />
      <AppAlertDialog
        isOpen={unbindTarget != null}
        onOpenChange={(open) => !open && setUnbindTarget(null)}
        type="danger"
        title={t('ai.models.unbindTitle')}
        description={t('ai.models.unbindDescription', { name: unbindTarget?.model.displayName })}
        confirmText={t('ai.models.unbind')}
        isConfirmLoading={unbinding}
        onConfirm={() => {
          if (unbindTarget) void unbind(unbindTarget);
        }}
      />
    </>
  );
}

export default ProviderSettingsSection;
