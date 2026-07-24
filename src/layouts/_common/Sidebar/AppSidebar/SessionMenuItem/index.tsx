import AppIconButton from '@/components/Button/AppIconButton';
import { FormField, Input } from '@/components/Input';
import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import AppFormDialog from '@/components/Overlay/AppFormDialog';
import { useChatService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { SessionMenuItemProps } from './index.type';
import styles from './style.module.less';

function SessionMenuItem({ session, onUpdated, onDeleted }: SessionMenuItemProps) {
  const chatService = useChatService();
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(session.title || '');
  const [editingTitleError, setEditingTitleError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { runAsync: runRenameSession } = useRequest(
    async (newTitle: string) =>
      chatService.renameSession({
        sessionId: session.id,
        newTitle,
      }),
    {
      manual: true,
      onSuccess: async () => {
        toast.success('重命名成功');
        setRenameModalOpen(false);
        await onUpdated();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { runAsync: runDeleteSession, loading: deleting } = useRequest(
    async () =>
      chatService.deleteSession({
        sessionId: session.id,
      }),
    {
      manual: true,
      onSuccess: async () => {
        toast.success('删除成功');
        onDeleted(session.id);
        await onUpdated();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const submitRename = async () => {
    const trimmedTitle = editingTitle.trim();
    if (!trimmedTitle) {
      setEditingTitleError('请输入对话标题');
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
      <span className={styles.sessionMenuLabelText}>{session.title || '未命名会话'}</span>

      <div className={`${styles.sessionActions} sessionActionsVisibleOnItem`}>
        <AppIconButton
          icon={<Pencil size={16} aria-hidden="true" />}
          label={`重命名 ${session.title || '未命名会话'}`}
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
          icon={<Trash2 size={16} aria-hidden="true" />}
          label={`删除 ${session.title || '未命名会话'}`}
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
        title="修改对话标题"
        confirmText="保存"
        onCancel={() => {
          setRenameModalOpen(false);
          setEditingTitle(session.title || '');
          setEditingTitleError('');
        }}
        onSubmit={() => void submitRename()}
      >
        <FormField
          aria-label="对话标题"
          label="对话标题"
          value={editingTitle}
          autoFocus
          onChange={(value) => {
            setEditingTitle(value);
            setEditingTitleError('');
          }}
          errorMessage={editingTitleError}
          isRequired
        >
          <Input placeholder="请输入对话标题" />
        </FormField>
      </AppFormDialog>
      <AppAlertDialog
        type="danger"
        isOpen={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="删除会话"
        description="删除后不可恢复，是否继续？"
        confirmText="删除"
        onConfirm={() => void confirmDeleteSession()}
        isConfirmLoading={deleting}
        isDismissable={!deleting}
      />
    </div>
  );
}

export default SessionMenuItem;
