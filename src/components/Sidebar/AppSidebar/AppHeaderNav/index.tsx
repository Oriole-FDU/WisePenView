import { useChatService, useNoteService } from '@/domains';
import { useNewChatSessionStore, useNewNoteStore } from '@/store';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { ListBox, ListBoxItem, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import clsx from 'clsx';
import { CirclePlus, FileText, PenTool, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AppHeaderNavProps } from './index.type';
import styles from './style.module.less';

function AppHeaderNav({ collapsed, onSessionCreated }: AppHeaderNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const chatService = useChatService();
  const noteService = useNoteService();
  const isDriveActive = location.pathname.startsWith('/app/drive');
  const isGroupActive = location.pathname.startsWith('/app/my-group');
  const selectedKeys = isDriveActive ? ['/app/drive'] : isGroupActive ? ['/app/my-group'] : [];
  const { run: runCreateSession, loading: createSessionLoading } = useRequest(
    async () => chatService.createSession(),
    {
      manual: true,
      onSuccess: (session) => {
        useNewChatSessionStore.getState().setNewChatSession({
          id: session.id,
          title: session.title,
        });
        onSessionCreated(session.id, session.title);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleCreateSession = () => {
    if (createSessionLoading) return;
    const { newChatSessionId, newChatSessionTitle } = useNewChatSessionStore.getState();
    if (newChatSessionId != null && newChatSessionId !== '') {
      onSessionCreated(newChatSessionId, newChatSessionTitle);
      return;
    }
    runCreateSession();
  };

  const { loading: creatingNote, run: runCreateNote } = useRequest(
    async () => {
      const { resourceId } = await noteService.createNote({ title: '未命名笔记' });
      if (!resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      return { resourceId };
    },
    {
      manual: true,
      onSuccess: ({ resourceId }) => {
        useNewNoteStore.getState().setNewNoteResourceId(resourceId);
        navigate(`/app/note/${encodeURIComponent(resourceId)}`);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleCreateNote = () => {
    if (creatingNote) return;
    const pendingNewNoteId = useNewNoteStore.getState().newNoteResourceId;
    if (pendingNewNoteId != null && pendingNewNoteId !== '') {
      navigate(`/app/note/${encodeURIComponent(pendingNewNoteId)}`);
      return;
    }
    runCreateNote();
  };

  return (
    <ListBox
      aria-label="应用导航"
      selectionMode="single"
      selectedKeys={selectedKeys}
      className={clsx(styles.headerMenu, collapsed && styles.headerMenuCollapsed)}
    >
      <ListBoxItem
        id="new-chat"
        textValue="新建对话"
        isDisabled={createSessionLoading}
        className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
        onPress={handleCreateSession}
      >
        <span className={styles.menuIcon}>
          <CirclePlus size={18} />
        </span>
        {!collapsed && <span className={styles.menuLabel}>新建对话</span>}
      </ListBoxItem>
      <ListBoxItem
        id="new-note"
        textValue="新建笔记"
        isDisabled={creatingNote}
        className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
        onPress={handleCreateNote}
      >
        <span className={styles.menuIcon}>
          <PenTool size={18} />
        </span>
        {!collapsed && <span className={styles.menuLabel}>新建笔记</span>}
      </ListBoxItem>
      <ListBoxItem
        id="/app/drive"
        textValue="文档与云盘"
        className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
        onPress={() => navigate('/app/drive')}
      >
        <span className={styles.menuIcon}>
          <FileText size={18} />
        </span>
        {!collapsed && <span className={styles.menuLabel}>文档与云盘</span>}
      </ListBoxItem>
      <ListBoxItem
        id="/app/my-group"
        textValue="我的小组"
        className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
        onPress={() => navigate('/app/my-group')}
      >
        <span className={styles.menuIcon}>
          <Users size={18} />
        </span>
        {!collapsed && <span className={styles.menuLabel}>我的小组</span>}
      </ListBoxItem>
    </ListBox>
  );
}

export default AppHeaderNav;
