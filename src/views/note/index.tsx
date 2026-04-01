import React, { useCallback, useRef, useState } from 'react';
import { useMount, useRequest, useUpdateEffect } from 'ahooks';
import { Alert, Button, Result, Spin } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { RiArrowLeftLine } from 'react-icons/ri';
import clsx from 'clsx';

import NoteEditor from '@/components/Note/NoteEditor';
import type { NoteEditorHandle } from '@/components/Note/NoteEditor/index.type';
import NoteInfoBar from '@/components/Note/NoteInfoBar';
import NoteTitle from '@/components/Note/NoteTitle';
import { useUserService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import styles from './style.module.less';

type UserLoadState =
  | { phase: 'idle' | 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; userId: string };

/**
 * 笔记路由页：在 SystemLayout 中间栏内全幅 Spin，直至用户信息 + Yjs 会话就绪；失败分两类，可重试。
 */
const NoteView: React.FC = () => {
  const { noteId } = useParams<{ noteId?: string }>();
  const resourceId = noteId ?? '';
  const userService = useUserService();
  const devFixedUserId =
    import.meta.env.DEV && (import.meta.env.VITE_NOTE_LOCAL_USER_ID?.trim() || 'local-dev-user');
  const [userLoad, setUserLoad] = useState<UserLoadState>({ phase: 'idle' });
  const [editorSessionReady, setEditorSessionReady] = useState(false);
  const [sessionErrorMessage, setSessionErrorMessage] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const bodyEditorRef = useRef<NoteEditorHandle>(null);

  const loadUser = useCallback(async () => {
    if (devFixedUserId) {
      setUserLoad({ phase: 'ready', userId: devFixedUserId });
      return;
    }
    setUserLoad({ phase: 'loading' });
    try {
      const u = await userService.getUserInfo();
      setUserLoad({ phase: 'ready', userId: u.id });
    } catch (err: unknown) {
      setUserLoad({
        phase: 'error',
        message: parseErrorMessage(err, '加载用户信息失败'),
      });
    }
  }, [devFixedUserId, userService]);

  useMount(() => {
    if (!resourceId) return;
    void loadUser();
  });

  useUpdateEffect(() => {
    if (!resourceId) return;
    void loadUser();
  }, [loadUser, resourceId]);

  useMount(() => {
    if (userLoad.phase !== 'ready') {
      setEditorSessionReady(false);
      setSessionErrorMessage(null);
      setSessionStatus('connected');
    }
  });

  useUpdateEffect(() => {
    if (userLoad.phase !== 'ready') {
      setEditorSessionReady(false);
      setSessionErrorMessage(null);
      setSessionStatus('connected');
    }
  }, [userLoad.phase]);

  const focusBody = useCallback(() => {
    bodyEditorRef.current?.focus();
  }, []);

  const retryUser = useCallback(() => {
    if (!resourceId) return;
    void loadUser();
  }, [loadUser, resourceId]);

  const retrySession = useCallback(() => {
    setSessionErrorMessage(null);
    setEditorSessionReady(false);
    setSessionStatus('connected');
    bodyEditorRef.current?.retrySession();
  }, []);

  const handleSessionReady = useCallback(() => {
    setEditorSessionReady(true);
    setSessionErrorMessage(null);
  }, []);

  const handleSessionError = useCallback((message: string) => {
    setSessionErrorMessage(message);
    setEditorSessionReady(false);
  }, []);

  const userId = userLoad.phase === 'ready' ? userLoad.userId : null;
  const mountEditorSubtree = Boolean(resourceId) && userId !== null && sessionErrorMessage === null;

  const showFullPageSpin =
    Boolean(resourceId) &&
    (userLoad.phase === 'loading' ||
      userLoad.phase === 'idle' ||
      (userLoad.phase === 'ready' && mountEditorSubtree && !editorSessionReady));

  if (!resourceId) {
    return (
      <div className={styles.pageWrap}>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <Result
              status="warning"
              title="无法打开笔记"
              extra={
                <Link to="/app/drive">
                  <Button type="default">返回云盘</Button>
                </Link>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrap}>
      {mountEditorSubtree && userId ? (
        <div
          className={clsx(styles.noteContent, editorSessionReady && styles.noteContentVisible)}
          aria-hidden={!editorSessionReady}
        >
          <div className={styles.root}>
            <header className={styles.pageHeader}>
              <Link to="/app/drive" className={styles.backLink}>
                <RiArrowLeftLine size={18} aria-hidden />
                <span>返回云盘</span>
              </Link>
            </header>
            {sessionStatus === 'disconnected' ? (
              <Alert
                className={styles.wsAlert}
                type="warning"
                showIcon
                description="网络连接已断开，当前可继续本地编辑；网络恢复后会自动同步到云端。"
              />
            ) : null}
            <NoteTitle id={noteId} focusOnMount={editorSessionReady} onEnterKey={focusBody} />
            <NoteInfoBar resourceId={resourceId} />
            <div className={styles.body}>
              <NoteEditor
                ref={bodyEditorRef}
                resourceId={resourceId}
                userId={userId}
                onSessionReady={handleSessionReady}
                onSessionError={handleSessionError}
                onSessionStatusChange={(isConnected) => {
                  setSessionStatus(isConnected ? 'connected' : 'disconnected');
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {userLoad.phase === 'error' ? (
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <Result
              status="error"
              title="加载失败"
              subTitle={userLoad.message}
              extra={
                <Button type="default" onClick={retryUser}>
                  重试
                </Button>
              }
            />
          </div>
        </div>
      ) : null}

      {sessionErrorMessage ? (
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <Result
              status="error"
              title="笔记连接失败"
              subTitle={sessionErrorMessage}
              extra={
                <Button type="default" onClick={retrySession}>
                  重试
                </Button>
              }
            />
          </div>
        </div>
      ) : null}

      {showFullPageSpin ? (
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <Spin size="large" />
        </div>
      ) : null}
    </div>
  );
};

export default NoteView;
