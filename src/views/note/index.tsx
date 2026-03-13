import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { RiArrowLeftLine } from 'react-icons/ri';

import Note from '@/components/Note';
import SaveStatusLight from '@/components/Note/SaveStatusLight';
import { UploadPipeline, type SaveStatus } from '@/components/Note/Pipeline';
import { useNoteService, useResourceService } from '@/contexts/ServicesContext';
import type { Block } from '@/types/note';

import styles from './style.module.less';

interface NoteData {
  resourceId: string;
  version: number;
  blocks: Block[];
  /** 最近编辑时间（来自 loadNote 的 updated_at） */
  lastEditedAt?: string;
}

type LoadState = 'loading' | 'success' | 'error';

const NotePage: React.FC = () => {
  const { noteId: resourceIdFromRoute } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const noteService = useNoteService();
  const resourceService = useResourceService();
  /** 从创建流程跳转进入时由 navigate state 传入 */
  const isNewlyCreated = (location.state as { fromCreate?: boolean } | null)?.fromCreate === true;

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [noteData, setNoteData] = useState<NoteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const noteSnapshotGetterRef = useRef<(() => Promise<{ blocks: Block[]; title?: string }>) | null>(
    null
  );

  // 加载或创建笔记
  const loadOrCreateNote = useCallback(async () => {
    setLoadState('loading');
    setError(null);

    try {
      if (resourceIdFromRoute) {
        // 有 resourceId，加载已有笔记
        const res = await noteService.loadNote(resourceIdFromRoute);
        if (!res.ok) {
          throw new Error('加载笔记失败');
        }
        setNoteData({
          resourceId: res.doc_id,
          version: res.version,
          blocks: res.blocks,
          lastEditedAt: res.updated_at,
        });
        setLoadState('success');
      } else {
        // 无 resourceId，创建新笔记
        const res = await noteService.createNote();
        if (!res.ok) {
          throw new Error('创建笔记失败');
        }
        // 创建成功后跳转到新笔记页面
        navigate(`/app/note/${res.doc_id}`, { replace: true, state: { fromCreate: true } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      setLoadState('error');
    }
  }, [resourceIdFromRoute, noteService, navigate]);

  useEffect(() => {
    loadOrCreateNote();
  }, [loadOrCreateNote]);

  // 创建 Pipeline（仅在 noteData 准备好后）
  const pipeline = useMemo(() => {
    if (!noteData) return null;
    return new UploadPipeline({
      noteService,
      resourceId: noteData.resourceId,
      initialVersion: noteData.version,
      getSnapshot: async () => {
        if (noteSnapshotGetterRef.current) {
          return noteSnapshotGetterRef.current();
        }
        throw new Error('Note snapshot getter is not ready');
      },
      onSaveStatusChange: setSaveStatus,
    });
  }, [noteService, noteData]);

  const handleTitleStable = useCallback(
    async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed || !noteData) return;
      try {
        await resourceService.renameResource({
          resourceId: noteData.resourceId,
          newName: trimmed,
        });
      } catch {
        // 重命名失败由上层或后续统一处理，此处仅静默
      }
    },
    [noteData, resourceService]
  );

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
