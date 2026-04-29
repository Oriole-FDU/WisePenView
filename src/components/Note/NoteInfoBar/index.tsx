import React from 'react';

import UserCapsule from '@/components/Common/UserCapsule';
import type { NoteInfoBarProps } from './index.type';
import styles from './style.module.less';

const NoteInfoBar: React.FC<NoteInfoBarProps> = ({ noteInfoDisplay }) => {
  const authors = noteInfoDisplay?.authors ?? [];

  return (
    <div className={styles.noteInfoBar}>
      <div className={`${styles.noteInfoItem} ${styles.authorsInfoItem}`}>
        <div className={styles.authorsWrap}>
          {authors.length > 0 ? (
            authors.map((author, index) => (
              <UserCapsule
                key={`${author.name}-${index}`}
                name={author.name}
                avatar={author.avatar}
                variant="bare"
              />
            ))
          ) : (
            <span className={styles.noteInfoValue}>暂无</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteInfoBar;
