import React from 'react';
import styles from './ToolCallBlock.module.less';

interface ToolCallBlockProps {
  content: string;
}

const ToolCallBlock: React.FC<ToolCallBlockProps> = ({ content }) => {
  if (!content) return null;

  const toolNames = Array.from(
    new Set(
      content
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
  const displayText = toolNames.join('、');
  if (!displayText) return null;

  return <div className={styles.toolWrapper}>调用工具：{displayText}</div>;
};

export default ToolCallBlock;
