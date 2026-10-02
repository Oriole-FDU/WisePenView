import { useMemoizedFn, useUnmount } from 'ahooks';
import { type ReactNode, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import UnsavedChangesDialog from '@/components/business/UnsavedChangesDialog';
import { createEditorExitPrompt } from '@/components/editors/_runtime/editorExitPrompt';
import { createEditorHost } from '@/components/editors/_runtime/editorHost';
import type { EditorExitReason } from '@/components/editors/editor.type';

import { useResourceEditorNavigation } from '../../controllers/useResourceEditorNavigation';
import { ResourceEditorContext } from './ResourceEditorContext';
import styles from './ResourceEditorProvider.module.less';

export function ResourceEditorProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation(['workspace', 'common']);
  const [host] = useState(createEditorHost);
  const [prompts] = useState(createEditorExitPrompt);
  const prompt = useSyncExternalStore(prompts.subscribe, prompts.getSnapshot);
  const [pendingCount, setPendingCount] = useState(0);
  useUnmount(() => {
    host.cancelExit();
    prompts.choose('cancel');
  });
  const requestExit = useMemoizedFn(async (reason: EditorExitReason) => {
    const request = prompts.createRequest();
    setPendingCount((count) => count + 1);
    try {
      return await host.requestExit(reason, request.confirm);
    } finally {
      setPendingCount((count) => count - 1);
      request.dispose();
    }
  });
  useResourceEditorNavigation(host, requestExit);
  const cancelExit = () => {
    host.cancelExit();
    prompts.choose('cancel');
  };
  return (
    <ResourceEditorContext.Provider value={{ host, registerEditor: host.register, requestExit }}>
      {children}
      {prompt ? (
        <UnsavedChangesDialog
          type={prompt.warning ? 'warning' : 'confirm'}
          isOpen
          title={prompt.title}
          description={prompt.description}
          confirmText={prompt.confirmText}
          discardText={prompt.discardText}
          onCancel={cancelExit}
          onConfirm={() => prompts.choose('save')}
          onDiscard={prompt.discardText ? () => prompts.choose('discard') : undefined}
        />
      ) : null}
      {pendingCount > 0 && !prompt ? (
        <div className={styles.pending} role="status">
          <span>{t('workspace:editorExit.preparing')}</span>
          <AppButton variant="secondary" onPress={cancelExit}>
            {t('common:actions.cancel')}
          </AppButton>
        </div>
      ) : null}
    </ResourceEditorContext.Provider>
  );
}
