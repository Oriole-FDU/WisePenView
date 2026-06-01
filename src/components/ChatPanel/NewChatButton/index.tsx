import React from 'react';
import { RiAddLine } from 'react-icons/ri';
import type { NewChatButtonProps } from './index.type';
import styles from '../style.module.less';

function NewChatButton({ onClick, compact = false }: NewChatButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.newChatButton} ${compact ? styles.compactNewChatButton : ''}`}
      onClick={onClick}
      aria-label="新建对话"
    >
      <span className={styles.newChatIconWrap}>
        <RiAddLine size={18} />
      </span>
      <span className={styles.newChatLabel}>新建对话</span>
    </button>
  );
}

export default NewChatButton;
