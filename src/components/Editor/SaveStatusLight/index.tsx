import React from 'react';

import type { SaveStatusLightProps } from './index.type';
import styles from './style.module.less';

const STATUS_TEXT: Record<SaveStatusLightProps['status'], string> = {
  saving: '保存中...',
  saved: '已保存',
  error: '保存失败',
};

const SaveStatusLight: React.FC<SaveStatusLightProps> = ({ status }) => {
  return (
    <span className={styles.wrapper}>
      <span className={styles.light} data-status={status} />
      <span className={styles.text}>{STATUS_TEXT[status]}</span>
    </span>
  );
};

export default SaveStatusLight;
