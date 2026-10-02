import { useMemoizedFn } from 'ahooks';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import UnsavedChangesDialog from '@/components/business/UnsavedChangesDialog';
import { createEditorHost } from '@/components/editors/_runtime/editorHost';
import type {
  EditorExitChoice,
  EditorExitPrompt,
  EditorExitReason,
} from '@/components/editors/editor.type';

import { useResourceEditorNavigation } from '../controllers/useResourceEditorNavigation';
import { ResourceEditorContext } from './ResourceEditorContext';
import styles from './ResourceEditorProvider.module.less';

interface PendingPrompt {
  data: EditorExitPrompt;
  resolve(choice: EditorExitChoice): void;
}

export function ResourceEditorProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation(['workspace', 'common']);
  const [host] = useState(createEditorHost);
  const [prompt, setPrompt] = useState<PendingPrompt>();
  const [pendingCount, setPendingCount] = useState(0);
  const confirm = useMemoizedFn(
    (data: EditorExitPrompt) =>
      new Promise<EditorExitChoice>((resolve) => {
        setPrompt((previous) => {
          previous?.resolve('cancel');
          return { data, resolve };
        });
      })
  );
  const choose = (choice: EditorExitChoice) => {
    prompt?.resolve(choice);
    setPrompt(undefined);
  };
  const requestExit = useMemoizedFn(async (reason: EditorExitReason) => {
    setPendingCount((count) => count + 1);
    try {
      return await host.requestExit(reason, confirm);
    } finally {
      setPendingCount((count) => count - 1);
      setPrompt((previous) => {
        previous?.resolve('cancel');
        return undefined;
      });
    }
  });
  useResourceEditorNavigation(host, requestExit);
  const cancelExit = () => {
    host.cancelExit();
    choose('cancel');
  };
  return (
    <ResourceEditorContext.Provider value={{ host, registerEditor: host.register, requestExit }}>
      {children}
      {prompt ? (
        <UnsavedChangesDialog
          type={prompt.data.warning ? 'warning' : 'confirm'}
          isOpen
          title={prompt.data.title}
          description={prompt.data.description}
          confirmText={prompt.data.confirmText}
          discardText={prompt.data.discardText}
          onCancel={cancelExit}
          onConfirm={() => choose('save')}
          onDiscard={prompt.data.discardText ? () => choose('discard') : undefined}
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
