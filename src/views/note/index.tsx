import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { RiArrowLeftLine } from 'react-icons/ri';

import Note from '@/components/Note';
import SaveStatusLight from '@/components/Note/SaveStatusLight';
import { UploadPipeline, type SaveStatus } from '@/components/Note/Pipeline';
import { useNoteService } from '@/contexts/ServicesContext';
import type { Block } from '@/types/note';

import styles from './style.module.less';

interface NoteData {
  docId: string;
  version: number;
  blocks: Block[];
}

type LoadState = 'loading' | 'success' | 'error';

const NotePage: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const noteService = useNoteService();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [noteData, setNoteData] = useState<NoteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  // 加载或创建笔记
  const loadOrCreateNote = useCallback(async () => {
    setLoadState('loading');
    setError(null);

    try {
      if (noteId) {
        // 有 noteId，加载已有笔记
        const res = await noteService.loadNote(noteId);
        if (!res.ok) {
          throw new Error('加载笔记失败');
        }
        setNoteData({
          docId: res.doc_id,
          version: res.version,
          blocks: res.blocks,
        });
        setLoadState('success');
      } else {
        // 无 noteId，创建新笔记
        const res = await noteService.createNote();
        if (!res.ok) {
          throw new Error('创建笔记失败');
        }
        // 创建成功后跳转到新笔记页面
        navigate(`/app/note/${res.doc_id}`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      setLoadState('error');
    }
  }, [noteId, noteService, navigate]);

  useEffect(() => {
    loadOrCreateNote();
  }, [loadOrCreateNote]);

  // 创建 Pipeline（仅在 noteData 准备好后）
  const pipeline = useMemo(() => {
    if (!noteData) return null;
    return new UploadPipeline({
      noteService,
      docId: noteData.docId,
      initialVersion: noteData.version,
      onSaveStatusChange: setSaveStatus,
    });
  }, [noteService, noteData]);

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
        <Note pipeline={pipeline} initialBlocks={noteData.blocks} />
      </div>
    </div>
  );
};

export default NotePage;
