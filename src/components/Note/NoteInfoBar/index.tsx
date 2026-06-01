import { Divider } from 'antd';

import ResourceInteractBar from '@/components/Common/ResourceInteractBar';
import UserCapsule from '@/components/Common/UserCapsule';
import type { NoteInfoBarProps } from './index.type';
import styles from './style.module.less';

function NoteInfoBar({ noteInfoDisplay, displayLikeCount }: NoteInfoBarProps) {
  const authors = noteInfoDisplay?.authors ?? [];
  const lastEditedAtText = noteInfoDisplay?.lastEditedAtText ?? '暂无';

  return (
    <div className={styles.noteInfoBar}>
      {/* 第一行：作者 / 上次编辑 */}
      <div className={styles.metaRow}>
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
        <Divider orientation="vertical" className={styles.infoDivider} />
        <div className={styles.noteInfoItem}>
          <span className={styles.noteInfoLabel}>上次编辑</span>
          <span className={styles.noteInfoValue}>{lastEditedAtText}</span>
        </div>
      </div>
      {/* 第二行：阅读量 / 点赞量 / 平均分（与 PDF 顶部展示一致） */}
      <div className={styles.interactRow}>
        <ResourceInteractBar
          readCount={noteInfoDisplay?.readCount}
          likeCount={displayLikeCount ?? noteInfoDisplay?.likeCount}
          scoreAvg={noteInfoDisplay?.scoreAvg}
        />
      </div>
    </div>
  );
}

export default NoteInfoBar;
