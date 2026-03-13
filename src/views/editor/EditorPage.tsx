import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { RiArrowLeftLine } from 'react-icons/ri';

import Editor from '@/components/Editor';
import SaveStatusLight from '@/components/Editor/SaveStatusLight';
import { EditorUploadPipeline } from '@/components/Editor/Pipeline';

import styles from './style.module.less';

const EditorPage: React.FC = () => {
  const pipeline = useMemo(() => new EditorUploadPipeline(), []);

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
        <Editor pipeline={pipeline} />
      </div>
    </div>
  );
};

export default EditorPage;
