import { Switch } from '@heroui/react';
import { KeyRound, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import { FormField, PasswordInput } from '@/components/base/Input';
import AppAlertDialog from '@/components/business/AppAlertDialog';
import AppFormDialog from '@/components/business/AppFormDialog';
import { useChatService } from '@/domains';
import type { ToolOption } from '@/domains/Chat';
import { useApi } from '@/hooks/useApi';

import styles from './style.module.less';

function WebSearchSettingsSection() {
  const { t } = useTranslation('profile');
  const chatService = useChatService();
  const [tools, setTools] = useState<ToolOption[]>([]);
  const [editingTool, setEditingTool] = useState<ToolOption | null>(null);
  const [deleteTool, setDeleteTool] = useState<ToolOption | null>(null);
  const [apiKey, setApiKey] = useState('');

  const { loading, runAsync: reload } = useApi(() => chatService.getTools(), {
    onSuccess: setTools,
  });
  const { loading: saving, runAsync: save } = useApi(
    (tool: ToolOption, key: string) =>
      chatService.updateUserToolConfig({
        toolName: tool.toolId,
        enabled: true,
        secretConfig: { api_key: key },
      }),
    {
      manual: true,
      onSuccess: () => {
        setEditingTool(null);
        void reload();
      },
    }
  );
  const { loading: toggling, runAsync: toggle } = useApi(
    (tool: ToolOption, enabled: boolean) =>
      chatService.updateUserToolConfig({ toolName: tool.toolId, enabled }),
    {
      manual: true,
      onSuccess: (updatedTool) => {
        setTools((current) =>
          current.map((tool) => (tool.toolId === updatedTool.toolId ? updatedTool : tool))
        );
      },
    }
  );
  const { loading: deleting, runAsync: remove } = useApi(
    (toolName: string) => chatService.deleteUserToolConfig(toolName),
    {
      manual: true,
      onSuccess: () => {
        setDeleteTool(null);
        void reload();
      },
    }
  );

  const webSearchTools = tools.filter(
    (tool) => tool.toolId === 'default_web_search' || tool.toolId.endsWith('_search')
  );
  const hasConfigurableTool = webSearchTools.some((tool) => tool.requiresConfig);

  const openEditor = (tool: ToolOption) => {
    setEditingTool(tool);
    setApiKey('');
  };

  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>{t('ai.search.title')}</h2>
            <p>{t('ai.search.description')}</p>
          </div>
        </div>
        {loading ? <div className={styles.empty}>{t('ai.loading')}</div> : null}
        {!loading && webSearchTools.length === 0 ? (
          <div className={styles.empty}>{t('ai.search.empty')}</div>
        ) : null}
        <div className={styles.rows}>
          {webSearchTools.map((tool) => {
            const isDefault = !tool.requiresConfig;
            return (
              <div className={styles.row} key={tool.toolId}>
                <div className={styles.rowCopy}>
                  <strong>{tool.displayName}</strong>
                  <span>
                    {isDefault
                      ? t('ai.search.defaultProvider')
                      : tool.configured
                        ? `${t('ai.search.configured')} · ${tool.secretFingerprints.api_key || t('ai.emptyValue')}`
                        : t('ai.search.notConfigured')}
                  </span>
                </div>
                {isDefault ? (
                  <span className={styles.status}>{t('ai.search.available')}</span>
                ) : (
                  <div className={styles.rowActions}>
                    <Switch
                      size="md"
                      isSelected={tool.enabled && tool.configured}
                      isDisabled={toggling || !tool.configured}
                      aria-label={tool.displayName}
                      onChange={(enabled) => void toggle(tool, enabled)}
                    >
                      <Switch.Content>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch.Content>
                    </Switch>
                    <AppButton size="sm" variant="ghost" onPress={() => openEditor(tool)}>
                      <KeyRound size={15} aria-hidden="true" />
                      {t('ai.actions.configure')}
                    </AppButton>
                    {tool.configured ? (
                      <AppButton size="sm" variant="ghost" onPress={() => setDeleteTool(tool)}>
                        <Trash2 size={15} aria-hidden="true" />
                        {t('ai.actions.delete')}
                      </AppButton>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {hasConfigurableTool ? (
          <div className={styles.note}>{t('ai.search.securityNote')}</div>
        ) : null}
      </section>

      <AppFormDialog
        isOpen={editingTool != null}
        onOpenChange={(open) => !open && setEditingTool(null)}
        title={editingTool?.displayName ?? ''}
        description={t('ai.search.formDescription')}
        confirmText={t('ai.actions.save')}
        isSubmitting={saving}
        isSubmitDisabled={!apiKey.trim()}
        onSubmit={() => {
          if (editingTool) void save(editingTool, apiKey.trim());
        }}
      >
        <FormField label={t('ai.search.apiKey')} value={apiKey} onChange={setApiKey} isRequired>
          <PasswordInput
            placeholder={t('ai.search.apiKeyPlaceholder')}
            showPasswordLabel={t('ai.actions.showKey')}
            hidePasswordLabel={t('ai.actions.hideKey')}
            autoFocus
          />
        </FormField>
      </AppFormDialog>

      <AppAlertDialog
        isOpen={deleteTool != null}
        onOpenChange={(open) => !open && setDeleteTool(null)}
        type="danger"
        title={t('ai.search.deleteTitle')}
        description={t('ai.search.deleteDescription', { name: deleteTool?.displayName })}
        confirmText={t('ai.actions.delete')}
        isConfirmLoading={deleting}
        onConfirm={() => {
          if (deleteTool) void remove(deleteTool.toolId);
        }}
      />
    </>
  );
}

export default WebSearchSettingsSection;
