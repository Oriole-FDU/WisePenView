import { useChatService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Button, Input, Modal, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import clsx from 'clsx';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { SessionMenuItemProps } from './index.type';
import styles from './style.module.less';

function SessionMenuItem({ session, onUpdated, onDeleted }: SessionMenuItemProps) {
  const chatService = useChatService();
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(session.title || '');
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
      toast.warning('请输入会话名称');
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
        <button
          type="button"
          className={styles.sessionActionBtn}
          aria-label={`重命名 ${session.title || '未命名会话'}`}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setEditingTitle(session.title || '');
            setRenameModalOpen(true);
          }}
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          className={clsx(styles.sessionActionBtn, styles.sessionDeleteBtn)}
          aria-label={`删除 ${session.title || '未命名会话'}`}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDeleteConfirmOpen(true);
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
      <Modal isOpen={renameModalOpen} onOpenChange={setRenameModalOpen}>
        <Modal.Backdrop isDismissable>
          <Modal.Container size="sm" placement="center">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>修改对话标题</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <TextField
                  aria-label="对话标题"
                  value={editingTitle}
                  autoFocus
                  onChange={setEditingTitle}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void submitRename();
                    }
                  }}
                >
                  <Input placeholder="请输入对话标题" />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onPress={() => {
                    setRenameModalOpen(false);
                    setEditingTitle(session.title || '');
                  }}
                >
                  取消
                </Button>
                <Button variant="primary" onPress={() => void submitRename()}>
                  保存
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
      <Modal isOpen={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <Modal.Backdrop isDismissable>
          <Modal.Container size="sm" placement="center">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>删除会话</Modal.Heading>
              </Modal.Header>
              <Modal.Body>删除后不可恢复，是否继续？</Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => setDeleteConfirmOpen(false)}>
                  取消
                </Button>
                <Button
                  variant="danger"
                  isDisabled={deleting}
                  onPress={() => void confirmDeleteSession()}
                >
                  删除
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

export default SessionMenuItem;
