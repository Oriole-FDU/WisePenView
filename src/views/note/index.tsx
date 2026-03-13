import React, { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RiArrowLeftLine } from 'react-icons/ri';

import Note from '@/components/Note';
import SaveStatusLight from '@/components/Note/SaveStatusLight';
import { UploadPipeline } from '@/components/Note/Pipeline';
import { useNoteService } from '@/contexts/ServicesContext';

import styles from './style.module.less';

const NotePage: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const noteService = useNoteService();
  const pipeline = useMemo(
    () => new UploadPipeline(noteService, Number(noteId)),
    [noteService, noteId]
  );

  useEffect(() => {
    return () => pipeline.dispose();
  }, [pipeline]);

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <Link to="/app/drive" className={styles.backLink}>
          <RiArrowLeftLine size={18} />
          <span>返回云盘</span>
        </Link>
        <SaveStatusLight status="saved" />
      </header>
      <div className={styles.editorArea}>
        <Note pipeline={pipeline} />
      </div>
    </div>
  );
};

export default NotePage;
