import React from 'react';
import { useRequest } from 'ahooks';
import { Avatar, Divider } from 'antd';

import { useNoteService } from '@/contexts/ServicesContext';
import type { NoteInfoBarProps } from './index.type';
import styles from './style.module.less';

const NoteInfoBar: React.FC<NoteInfoBarProps> = ({ resourceId }) => {
  const noteService = useNoteService();

  const { data: noteInfoDisplay } = useRequest(
    () => noteService.getNoteInfoDisplay({ resourceId }),
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );

  const authors = noteInfoDisplay?.authors ?? [];
  const lastEditedAtText = noteInfoDisplay?.lastEditedAtText ?? '暂无';

  return (
    <div className={styles.noteInfoBar}>
      <div className={`${styles.noteInfoItem} ${styles.authorsInfoItem}`}>
        <div className={styles.authorsWrap}>
          {authors.length > 0 ? (
            authors.map((author, index) => (
              <div className={styles.authorItem} key={`${author.name}-${index}`}>
                <Avatar size="small" src={author.avatar}>
                  {author.name.slice(0, 1)}
                </Avatar>
                <span className={styles.noteInfoValue}>{author.name}</span>
              </div>
            ))
          ) : (
            <span className={styles.noteInfoValue}>暂无</span>
          )}
        </div>
      </div>
      <Divider orientation="vertical" className={styles.infoDivider} />
      <div className={styles.noteInfoItem}>
        <span className={styles.noteInfoLabel}>上次编辑</span>
        <span className={styles.noteInfoValue}>{lastEditedAtText}</span>
      </div>
    </div>
  );
};

export default NoteInfoBar;
