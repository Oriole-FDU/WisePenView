import AppIconButton from '@/components/Button/AppIconButton';
import { FormField, Input } from '@/components/Input';
import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import AppFormDialog from '@/components/Overlay/AppFormDialog';
import { useChatService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { toast } from '@heroui/react';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SessionMenuItemProps } from './index.type';
import styles from './style.module.less';

function SessionMenuItem({ session, onUpdated, onDeleted }: SessionMenuItemProps) {
  const { t } = useTranslation(['chat', 'common']);
  const chatService = useChatService();
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(session.title || '');
  const [editingTitleError, setEditingTitleError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { runAsync: runRenameSession } = useApi(
    async (newTitle: string) =>
      chatService.renameSession({
        sessionId: session.id,
        newTitle,
      }),
    {
      manual: true,
      onSuccess: async () => {
        toast.success(t('chat:session.renameSuccess'));
        setRenameModalOpen(false);
        await onUpdated();
      },
    }
  );

  const { runAsync: runDeleteSession, loading: deleting } = useApi(
    async () =>
      chatService.deleteSession({
        sessionId: session.id,
      }),
    {
      manual: true,
      onSuccess: async () => {
        toast.success(t('chat:session.deleteSuccess'));
        onDeleted(session.id);
        await onUpdated();
      },
    }
  );

  const submitRename = async () => {
    const trimmedTitle = editingTitle.trim();
    if (!trimmedTitle) {
      setEditingTitleError(t('chat:session.titleRequired'));
      return;
    }
    await runRenameSession(trimmedTitle);
  };

  const confirmDeleteSession = async () => {
    await runDeleteSession();
    setDeleteConfirmOpen(false);
  };

  return (
    <div className={styles.sessionMenuLabel}>
      <span className={styles.sessionMenuLabelText}>
        {session.title || t('chat:session.untitled')}
      </span>

      <div className={`${styles.sessionActions} sessionActionsVisibleOnItem`}>
        <AppIconButton
          icon={<Pencil size={14} aria-hidden="true" />}
          label={t('chat:session.renameAction', {
            name: session.title || t('chat:session.untitled'),
          })}
          size="sm"
          className={styles.sessionActionBtn}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setEditingTitle(session.title || '');
            setEditingTitleError('');
            setRenameModalOpen(true);
          }}
        />
        <AppIconButton
          icon={<Trash2 size={14} aria-hidden="true" />}
          label={t('chat:session.deleteAction', {
            name: session.title || t('chat:session.untitled'),
          })}
          size="sm"
          variant="danger"
          className={styles.sessionActionBtn}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDeleteConfirmOpen(true);
          }}
        />
      </div>
      <AppFormDialog
        isOpen={renameModalOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingTitleError('');
          }
          setRenameModalOpen(nextOpen);
        }}
        title={t('chat:session.renameTitle')}
        confirmText={t('common:actions.save')}
        onCancel={() => {
          setRenameModalOpen(false);
          setEditingTitle(session.title || '');
          setEditingTitleError('');
        }}
        onSubmit={() => void submitRename()}
      >
        <FormField
          aria-label={t('chat:session.titleLabel')}
          label={t('chat:session.titleLabel')}
          value={editingTitle}
          autoFocus
          onChange={(value) => {
            setEditingTitle(value);
            setEditingTitleError('');
          }}
          errorMessage={editingTitleError}
          isRequired
        >
          <Input placeholder={t('chat:session.titlePlaceholder')} />
        </FormField>
      </AppFormDialog>
      <AppAlertDialog
        type="danger"
        isOpen={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t('chat:session.deleteTitle')}
        description={t('chat:session.deleteDescription')}
        confirmText={t('common:actions.delete')}
        onConfirm={() => void confirmDeleteSession()}
        isConfirmLoading={deleting}
        isDismissable={!deleting}
      />
    </div>
  );
}

export default SessionMenuItem;
