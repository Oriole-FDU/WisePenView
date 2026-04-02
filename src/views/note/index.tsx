import React, { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { Alert, Button, Result, Spin } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { RiArrowLeftLine } from 'react-icons/ri';
import clsx from 'clsx';

import NoteEditor from '@/components/Note/NoteEditor';
import type { NoteEditorHandle } from '@/components/Note/NoteEditor/index.type';
import { useNoteConnection } from '@/connection/plugins/note';
import NoteInfoBar from '@/components/Note/NoteInfoBar';
import NoteTitle from '@/components/Note/NoteTitle';
import { useEffectForce } from '@/hooks/useEffectForce';
import { useParamsEffect } from '@/hooks/useParamsEffect';
import styles from './style.module.less';

const SESSION_ERROR_MESSAGE = '连接笔记服务失败，请检查网络或稍后重试';

/**
 * 笔记路由页：在 SystemLayout 中间栏内全幅 Spin，直至用户信息 + Yjs 会话就绪；失败分两类，可重试。
 * 协同连接状态由页面消费 `useNoteConnection`，再驱动 Spin / 断线提示 / 错误层；编辑器仅接收 doc/provider。
 */
const NoteView: React.FC = () => {
  const { noteId } = useParams<{ noteId?: string }>();
  const resourceId = noteId ?? '';
  const { status, data } = useNoteConnection(resourceId);

  useSyncExternalStore(
    (onStoreChange) => data.subscribeResources(onStoreChange),
    () => data.getResourceVersion(),
    () => data.getResourceVersion()
  );

  const doc = data.doc;
  const provider = data.provider;

  const [editorSessionReady, setEditorSessionReady] = useState(false);
  const [sessionErrorMessage, setSessionErrorMessage] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const bodyEditorRef = useRef<NoteEditorHandle>(null);

  const readyNotifiedRef = useRef(false);
  const errorNotifiedRef = useRef(false);
  const prevResourceIdRef = useRef(resourceId);

  const resetSessionState = useCallback(() => {
    setEditorSessionReady(false);
    setSessionErrorMessage(null);
    setSessionStatus('connected');
  }, []);

  useParamsEffect([resourceId], (nextResourceId) => {
    resetSessionState();
    if (!nextResourceId) return;
  });

  useEffectForce(() => {
    if (prevResourceIdRef.current !== resourceId) {
      prevResourceIdRef.current = resourceId;
      readyNotifiedRef.current = false;
      errorNotifiedRef.current = false;
    }

    setSessionStatus(status === 'connected' ? 'connected' : 'disconnected');

    if (status === 'connected' && !readyNotifiedRef.current) {
      readyNotifiedRef.current = true;
      setEditorSessionReady(true);
      setSessionErrorMessage(null);
    }

    if (status === 'error' && !errorNotifiedRef.current) {
      errorNotifiedRef.current = true;
      setSessionErrorMessage(SESSION_ERROR_MESSAGE);
      setEditorSessionReady(false);
    }

    if (status !== 'error') {
      errorNotifiedRef.current = false;
    }
  }, [resourceId, status]);

  const focusBody = useCallback(() => {
    bodyEditorRef.current?.focus();
  }, []);

  const retrySession = useCallback(() => {
    setSessionErrorMessage(null);
    setEditorSessionReady(false);
    setSessionStatus('connected');
    bodyEditorRef.current?.retrySession();
  }, []);

  const mountEditorSubtree = Boolean(resourceId) && sessionErrorMessage === null;
  const canRenderEditor = mountEditorSubtree && doc !== null && provider !== null;

  const showFullPageSpin = Boolean(resourceId) && mountEditorSubtree && !editorSessionReady;

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
      {mountEditorSubtree ? (
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
            <NoteTitle
              key={resourceId}
              id={noteId}
              focusOnMount={editorSessionReady}
              onEnterKey={focusBody}
            />
            <NoteInfoBar resourceId={resourceId} />
            <div className={styles.body}>
              {canRenderEditor ? (
                <NoteEditor
                  key={resourceId}
                  ref={bodyEditorRef}
                  resourceId={resourceId}
                  doc={doc}
                  provider={provider}
                />
              ) : null}
            </div>
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
