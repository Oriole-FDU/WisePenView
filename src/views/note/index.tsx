<<<<<<< HEAD
// eslint-disable-next-line no-restricted-imports -- Note 待重构：暂时允许 useEffect
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
=======
import React from 'react';
import { Divider } from 'antd';
import { Link, useParams } from 'react-router-dom';
>>>>>>> caaf14c (refactor(note): 精简笔记页与标题编辑并接入 syncTitle)
import { RiArrowLeftLine } from 'react-icons/ri';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { zh } from '@blocknote/core/locales';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import NoteTitle from '@/components/Note/NoteTitle';
import styles from './style.module.less';

/**
 * 笔记路由页：页头 + NoteTitle（单行 H1 BlockNote）+ 正文编辑器。
 * 标题初始内容待与云端「笔记详情/正文」接口一并接入后再填充；当前仅 URL 带 noteId，同步改名仍走 syncTitle。
 */
const NoteView: React.FC = () => {
  const { noteId } = useParams<{ noteId?: string }>();

  const editor = useCreateBlockNote({
    dictionary: zh,
  });

  return (
    <div className={styles.root}>
      <header className={styles.pageHeader}>
        <Link to="/app/drive" className={styles.backLink}>
          <RiArrowLeftLine size={18} aria-hidden />
          <span>返回云盘</span>
        </Link>
      </header>
      <NoteTitle id={noteId} />
      <Divider className={styles.titleDivider} />
      <div className={styles.body}>
        <BlockNoteView editor={editor} theme="light" />
      </div>
    </div>
  );
};

export default NoteView;
