import React, { useCallback, useRef, useState } from 'react';
import { Alert, Button, Result, Spin } from 'antd';
import { useRequest, useUnmount } from 'ahooks';
import { Link, useParams } from 'react-router-dom';

import ResourceViewerHeader from '@/components/Common/ResourceViewerHeader';
import CustomBlockNote from '@/components/Note/CustomBlockNote';
import type { NoteBodyEditorHandle } from '@/components/Note/CustomBlockNote/index.type';
import NoteInfoBar from '@/components/Note/NoteInfoBar';
import NoteTitle from '@/components/Note/NoteTitle';
import { useNoteService } from '@/contexts/ServicesContext';
import type { NoteInfoDisplayData } from '@/services/Note';
import { useSmoothFlag } from '@/hooks/useSmoothFlag';
import { useNoteSession } from '@/session/note/useNoteSession';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import styles from './style.module.less';

interface NoteViewConnectedProps {
  noteId?: string;
  resourceId: string;
  noteInfoDisplay: NoteInfoDisplayData;
}

const NoteViewConnected: React.FC<NoteViewConnectedProps> = ({
  noteId,
  resourceId,
  noteInfoDisplay,
}) => {
  const bodyEditorRef = useRef<NoteBodyEditorHandle>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const [isReconnectLoading, setIsReconnectLoading] = useState(false);
  const { status, doc, provider, reconnect } = useNoteSession(resourceId);

  const isConnected = status === 'connected';
  const isDisconnected = useSmoothFlag(status === 'disconnected', 2000, 2000);
  const isEditorReadOnly = status === 'connecting';
  const showFullPageSpin = status === 'connecting';

  const focusBody = useCallback(() => {
    bodyEditorRef.current?.focus();
  }, []);

  useUnmount(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  });

  const handleReconnect = useCallback(() => {
    reconnect();

    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
    }

    setIsReconnectLoading(true);
    reconnectTimerRef.current = window.setTimeout(() => {
      setIsReconnectLoading(false);
      reconnectTimerRef.current = null;
    }, 2000);
  }, [reconnect]);

  return (
    <div className={styles.pageWrap}>
      <ResourceViewerHeader
        lastEditedAtText={noteInfoDisplay.lastEditedAtText}
        titleBlock={
          <NoteTitle
            key={`${resourceId}-${noteInfoDisplay?.noteTitle ?? ''}`}
            id={noteId}
            initialContent={noteInfoDisplay?.noteTitle}
            focusOnMount={isConnected}
            onEnterKey={focusBody}
          />
        }
      />
      <div className={styles.noteContent}>
        <div className={styles.root}>
          {isDisconnected ? (
            <Alert
              className={styles.wsAlert}
              type="warning"
              description="网络连接已断开，当前可继续本地编辑；网络恢复后会自动同步到云端。"
              action={
                <Button
                  type="default"
                  size="small"
                  loading={isReconnectLoading}
                  onClick={handleReconnect}
                >
                  重试
                </Button>
              }
            />
          ) : null}
          <NoteInfoBar noteInfoDisplay={noteInfoDisplay} />
          <div className={styles.body}>
            <CustomBlockNote
              key={resourceId}
              ref={bodyEditorRef}
              resourceId={resourceId}
              doc={doc}
              provider={provider}
              readOnly={isEditorReadOnly}
            />
          </div>
        </div>
      </div>

      {showFullPageSpin ? (
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>正在连接笔记服务...</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const NoteView: React.FC = () => {
  const { noteId } = useParams<{ noteId?: string }>();
  const resourceId = noteId ?? '';
  const noteService = useNoteService();
  const {
    data: noteInfoDisplay,
    loading: isNoteInfoLoading,
    error: noteInfoError,
  } = useRequest(() => noteService.getNoteInfoDisplay({ resourceId }), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  if (!resourceId) {
    return (
      <div className={styles.pageWrap}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
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
      </div>
    );
  }

  if (noteInfoError) {
    return (
      <div className={styles.pageWrap}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay}>
            <div className={styles.middleOverlayInner}>
              <Result
                status="warning"
                title="无法打开笔记"
                subTitle={parseErrorMessage(noteInfoError, '笔记不存在或无访问权限')}
                extra={
                  <Link to="/app/drive">
                    <Button type="default">返回云盘</Button>
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isNoteInfoLoading) {
    return (
      <div className={styles.pageWrap}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
            <div className={styles.middleOverlayLoading}>
              <Spin size="large" />
              <span className={styles.middleOverlayText}>正在加载笔记信息...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!noteInfoDisplay) {
    return (
      <div className={styles.pageWrap}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay}>
            <div className={styles.middleOverlayInner}>
              <Result
                status="warning"
                title="无法打开笔记"
                subTitle="笔记信息为空，请稍后重试"
                extra={
                  <Link to="/app/drive">
                    <Button type="default">返回云盘</Button>
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <NoteViewConnected noteId={noteId} resourceId={resourceId} noteInfoDisplay={noteInfoDisplay} />
  );
};

export default NoteView;
