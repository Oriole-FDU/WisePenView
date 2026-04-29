import React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { RiArrowLeftLine } from 'react-icons/ri';

import type { ResourceViewerHeaderProps } from './index.type';
import styles from './style.module.less';

const DEFAULT_BACK_TO = '/app/drive';
const DEFAULT_BACK_LABEL = '返回云盘';

const ResourceViewerHeader: React.FC<ResourceViewerHeaderProps> = ({
  backTo = DEFAULT_BACK_TO,
  backLabel = DEFAULT_BACK_LABEL,
  inlineTitle,
  lastEditedAtText,
  extra,
  titleBlock,
  className,
}) => {
  const showLastEdited = Boolean(lastEditedAtText);

  return (
    <header className={clsx(styles.root, className)}>
      <div className={styles.bar}>
        <div className={styles.toolbar}>
          <Link to={backTo} className={styles.backLink}>
            <RiArrowLeftLine size={18} aria-hidden />
            <span>{backLabel}</span>
          </Link>
          <div className={styles.toolbarMiddle}>
            {inlineTitle ? <div className={styles.inlineTitle}>{inlineTitle}</div> : null}
          </div>
          {showLastEdited ? (
            <div className={styles.lastEdited}>
              <span className={styles.lastEditedLabel}>上次编辑</span>
              <span>{lastEditedAtText}</span>
            </div>
          ) : null}
          <div className={styles.toolbarEnd}>{extra}</div>
        </div>
      </div>
      {titleBlock ? (
        <div className={styles.titleBlock}>
          <div className={styles.titleBlockInner}>{titleBlock}</div>
        </div>
      ) : null}
    </header>
  );
};

export default ResourceViewerHeader;
