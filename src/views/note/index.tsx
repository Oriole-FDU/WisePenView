// eslint-disable-next-line no-restricted-imports -- Note 待重构：暂时允许 useEffect
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { RiArrowLeftLine } from 'react-icons/ri';
import Note from '@/components/Note';
import SaveStatusLight from '@/components/Note/SaveStatusLight';
import { UploadPipeline, type SaveStatus, type ConnectionState } from '@/components/Note/Pipeline';
import { useNoteService, useResourceService } from '@/contexts/ServicesContext';
import type { Block } from '@/types/note';
import type { NotePageLoadState, NotePageLocationState, NotePageNoteData } from './index.type';
import { useAppMessage } from '@/hooks/useAppMessage';

import styles from './style.module.less';

const NotePage: React.FC = () => {
  const { noteId: resourceIdFromRoute } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const message = useAppMessage();
  const noteService = useNoteService();
  const resourceService = useResourceService();
  const locationState = location.state as NotePageLocationState | null;
  /** 从创建流程跳转进入时由 navigate state 传入 */
  const isNewlyCreated = locationState?.fromCreate === true;

  const [loadState, setLoadState] = useState<NotePageLoadState>('loading');
  const [noteData, setNoteData] = useState<NotePageNoteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [connectionState, setConnectionState] = useState<ConnectionState>('online');
  const noteSnapshotGetterRef = useRef<(() => Promise<{ blocks: Block[]; title?: string }>) | null>(
    null
  );
  const pendingTitleRenameRef = useRef<string | null>(null);
  const previousConnectionStateRef = useRef<ConnectionState>('online');

  // 加载或创建笔记
  const loadOrCreateNote = useCallback(async () => {
    setLoadState('loading');
    setError(null);

    try {
      if (resourceIdFromRoute) {
        // 如果是从创建流程跳转过来且带有初始 noteData，则直接使用这份数据，避免依赖首次 loadNote 成功
        if (isNewlyCreated && locationState?.initialNoteData) {
          setNoteData(locationState.initialNoteData);
          setLoadState('success');
          return;
        }
        // 有 resourceId，加载已有笔记
        const res = await noteService.loadNote(resourceIdFromRoute);
        if (!res.ok) {
          throw new Error('加载笔记失败');
        }
        setNoteData({
          resourceId: res.resourceId,
          version: res.version,
          blocks: res.blocks,
          lastEditedAt: res.updated_at,
        });
        setLoadState('success');
      } else {
        // 无 resourceId：create 只保证落库与返回 resourceId/version，正文由 load 拉取
        const created = await noteService.createNote();
        if (!created.ok) {
          throw new Error('创建笔记失败');
        }
        const loaded = await noteService.loadNote(created.resourceId);
        if (!loaded.ok) {
          throw new Error('加载笔记失败');
        }
        const createdNoteData: NotePageNoteData = {
          resourceId: loaded.resourceId,
          version: loaded.version,
          blocks: loaded.blocks,
          lastEditedAt: loaded.updated_at,
        };
        setNoteData(createdNoteData);
        setLoadState('success');
        navigate(`/app/note/${created.resourceId}`, {
          replace: true,
          state: { fromCreate: true, initialNoteData: createdNoteData },
        });
      }
    } catch (err) {
      const isNavigatorOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      const errorWithCode = err as { code?: string } | null;
      const isAxiosNetworkError = errorWithCode?.code === 'ERR_NETWORK';
      const isNetworkError = isNavigatorOffline || isAxiosNetworkError;

      if (isNetworkError) {
        setError('加载失败，请检查网络后重试');
      } else {
        setError(err instanceof Error ? err.message : '未知错误');
      }
      setLoadState('error');
    }
  }, [resourceIdFromRoute, isNewlyCreated, locationState, noteService, navigate]);

  useEffect(() => {
    loadOrCreateNote();
  }, [loadOrCreateNote]);

  // 创建 Pipeline（仅在 noteData 准备好后）
  const pipeline = useMemo(() => {
    if (!noteData) return null;
    return new UploadPipeline({
      noteService,
      resourceService,
      resourceId: noteData.resourceId,
      initialVersion: noteData.version,
      getSnapshot: async () => {
        if (noteSnapshotGetterRef.current) {
          return noteSnapshotGetterRef.current();
        }
        throw new Error('Note snapshot getter is not ready');
      },
      onConnectionStateChange: setConnectionState,
      onSaveStatusChange: setSaveStatus,
    });
  }, [noteService, resourceService, noteData]);

  const handleTitleStable = useCallback(
    async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed || !noteData) return;

      const isNavigatorOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      const isPipelineOffline = connectionState === 'offline';

      // 离线模式：提醒用户并记录 pending rename，等待恢复在线后再补发
      if (isNavigatorOffline || isPipelineOffline) {
        pendingTitleRenameRef.current = trimmed;
        message.info('当前离线，标题修改将在网络恢复后生效');
        return;
      }

      try {
        await resourceService.renameResource({
          resourceId: noteData.resourceId,
          newName: trimmed,
        });
      } catch {
        // 重命名失败由上层或后续统一处理，此处仅静默
      }
    },
    [connectionState, noteData, resourceService, message]
  );

  // 当连接从 offline 恢复为 online 时，如果存在 pending rename，则补发一次重命名
  useEffect(() => {
    if (connectionState !== 'online') return;
    const pendingTitle = pendingTitleRenameRef.current;
    if (!pendingTitle || !noteData) return;

    pendingTitleRenameRef.current = null;

    void (async () => {
      try {
        await resourceService.renameResource({
          resourceId: noteData.resourceId,
          newName: pendingTitle,
        });
      } catch {
        // 若补发失败，暂时静默处理，后续可按需接入统一错误提示
      }
    })();
  }, [connectionState, noteData, resourceService]);

  // 监听连接状态变化：从 online -> offline 时，提醒用户已进入离线模式，但继续允许编辑
  useEffect(() => {
    if (previousConnectionStateRef.current !== 'offline' && connectionState === 'offline') {
      message.warning(
        '当前已进入离线模式，后续编辑内容会优先保存在本地，网络恢复后将自动重试同步，但仍存在少量无法保存的风险，请注意备份重要内容。'
      );
    }
    previousConnectionStateRef.current = connectionState;
  }, [connectionState, message]);

  // 清理 Pipeline
  useEffect(() => {
    return () => pipeline?.dispose();
  }, [pipeline]);

  // 加载中
  if (loadState === 'loading') {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loadingContainer}>加载中...</div>
      </div>
    );
  }

  // 加载失败
  if (loadState === 'error' || !noteData || !pipeline) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.errorContainer}>
          <p>{error || '加载失败'}</p>
          <button onClick={loadOrCreateNote}>重试</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <Link to="/app/drive" className={styles.backLink}>
          <RiArrowLeftLine size={18} />
          <span>返回云盘</span>
        </Link>
        <SaveStatusLight status={saveStatus} />
      </header>
      <div className={styles.editorArea}>
        <Note
          pipeline={pipeline}
          initialBlocks={noteData.blocks}
          lastEditedAt={noteData.lastEditedAt}
          isNewlyCreated={isNewlyCreated}
          onTitleStable={handleTitleStable}
          onRegisterGetSnapshot={(getter) => {
            noteSnapshotGetterRef.current = getter;
          }}
        />
      </div>
    </div>
  );
};

export default NotePage;
