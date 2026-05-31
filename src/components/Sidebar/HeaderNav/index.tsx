import React, { useCallback } from 'react';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  RiAddCircleFill,
  RiFileTextLine,
  RiGroupFill,
  RiPenNibFill,
  RiRobot2Line,
} from 'react-icons/ri';
import { useChatService, useNoteService } from '@/domains';
import { useAppMessage } from '@/hooks/useAppMessage';
import {
  clearNewChatSessionStore,
  useChatPanelStore,
  useCurrentChatSessionStore,
  useNewChatSessionStore,
  useNewNoteStore,
} from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { useRequest } from 'ahooks';
import type { HeaderNavProps } from './index.type';
import styles from './style.module.less';

function HeaderNav({ collapsed, onSessionCreated }: HeaderNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const chatService = useChatService();
  const noteService = useNoteService();
  const messageApi = useAppMessage();
  const clearCurrentSession = useCurrentChatSessionStore((s) => s.clearCurrentSession);
  const setChatPanelCollapsed = useChatPanelStore((s) => s.setChatPanelCollapsed);
  const setChatPanelDraftOpen = useChatPanelStore((s) => s.setChatPanelDraftOpen);

  const isDriveActive = location.pathname.startsWith('/app/drive');
  const isGroupActive = location.pathname.startsWith('/app/my-group');
  const isChatActive = location.pathname.startsWith('/app/chat');
  const selectedKeys = isChatActive
    ? ['/app/chat']
    : isDriveActive
      ? ['/app/drive']
      : isGroupActive
        ? ['/app/my-group']
        : [];

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
        messageApi.error(parseErrorMessage(err));
      },
    }
  );

  const handleCreateSession = useCallback(() => {
    if (isChatActive) {
      clearCurrentSession();
      clearNewChatSessionStore();
      setChatPanelDraftOpen(false);
      navigate('/app/chat');
      return;
    }

    clearCurrentSession();
    clearNewChatSessionStore();
    setChatPanelDraftOpen(true);
    setChatPanelCollapsed(false);
  }, [clearCurrentSession, isChatActive, navigate, setChatPanelCollapsed, setChatPanelDraftOpen]);

  const { loading: creatingNote, run: runCreateNote } = useRequest(
    async () => {
      const { resourceId } = await noteService.createNote({ title: '未命名笔记' });
      if (!resourceId) {
        throw new Error('创建笔记失败：未获取到资源ID');
      }
      return { resourceId };
    },
    {
      manual: true,
      onSuccess: ({ resourceId }) => {
        useNewNoteStore.getState().setNewNoteResourceId(resourceId);
        navigate(`/app/note/${encodeURIComponent(resourceId)}`);
      },
      onError: () => {
        messageApi.error('创建笔记失败，请稍后重试');
      },
    }
  );

  const handleCreateNote = useCallback(() => {
    if (creatingNote) return;
    const pendingNewNoteId = useNewNoteStore.getState().newNoteResourceId;
    if (pendingNewNoteId != null && pendingNewNoteId !== '') {
      navigate(`/app/note/${encodeURIComponent(pendingNewNoteId)}`);
      return;
    }
    runCreateNote();
  }, [creatingNote, navigate, runCreateNote]);

  const menuItems: MenuProps['items'] = [
    {
      key: 'new-chat',
      icon: <RiAddCircleFill size={18} />,
      onClick: () => handleCreateSession(),
      disabled: createSessionLoading,
      label: '新建对话',
    },
    {
      key: 'new-note',
      icon: <RiPenNibFill size={18} />,
      onClick: () => handleCreateNote(),
      disabled: creatingNote,
      label: '新建笔记',
    },
    {
      key: '/app/chat',
      icon: <RiRobot2Line size={18} />,
      onClick: () => navigate('/app/chat'),
      label: 'AI 对话',
    },
    {
      key: '/app/drive',
      icon: <RiFileTextLine size={18} />,
      onClick: () => navigate('/app/drive'),
      label: '文档与云盘',
    },
    {
      key: '/app/my-group',
      icon: <RiGroupFill size={18} />,
      onClick: () => navigate('/app/my-group'),
      label: '我的小组',
    },
  ];

  return (
    <Menu
      mode="inline"
      theme="light"
      className={styles.headerMenu}
      selectedKeys={selectedKeys}
      inlineCollapsed={collapsed}
      items={menuItems}
    />
  );
}

export default HeaderNav;