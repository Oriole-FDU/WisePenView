<<<<<<< HEAD
<<<<<<< HEAD
// eslint-disable-next-line no-restricted-imports -- Note 待重构：暂时允许 useEffect
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
=======
import React from 'react';
import { Divider } from 'antd';
=======
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Divider, Result, Spin } from 'antd';
>>>>>>> 3b78f5e (refactor(note): 使用yjs重构note，完成了底层信道的建设)
import { Link, useParams } from 'react-router-dom';
>>>>>>> caaf14c (refactor(note): 精简笔记页与标题编辑并接入 syncTitle)
import { RiArrowLeftLine } from 'react-icons/ri';
import clsx from 'clsx';

import NoteYjsEditor from '@/components/Note/YjsEditor';
import type { NoteYjsEditorHandle } from '@/components/Note/YjsEditor/index.type';
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
  const [userRetryToken, setUserRetryToken] = useState(0);
  const [editorSessionReady, setEditorSessionReady] = useState(false);
  const [sessionErrorMessage, setSessionErrorMessage] = useState<string | null>(null);
  const [editorRetryToken, setEditorRetryToken] = useState(0);
  const [sessionStatus, setSessionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const bodyEditorRef = useRef<NoteYjsEditorHandle>(null);

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

  useEffect(() => {
    if (!resourceId) return;
    void loadUser();
  }, [loadUser, resourceId, userRetryToken]);

  useEffect(() => {
    if (userLoad.phase !== 'ready') {
      setEditorSessionReady(false);
      setSessionErrorMessage(null);
      setSessionStatus('connected');
    }
  }, [userLoad.phase, editorRetryToken]);

  const focusBody = useCallback(() => {
    bodyEditorRef.current?.focus();
  }, []);

  const retryUser = useCallback(() => {
    setUserRetryToken((n) => n + 1);
  }, []);

  const retrySession = useCallback(() => {
    setSessionErrorMessage(null);
    setEditorSessionReady(false);
    setSessionStatus('connected');
    setEditorRetryToken((n) => n + 1);
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
                  <Button type="primary">返回云盘</Button>
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
            <Divider className={styles.titleDivider} />
            <div className={styles.body}>
              <NoteYjsEditor
                key={editorRetryToken}
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
                <Button type="primary" onClick={retryUser}>
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
