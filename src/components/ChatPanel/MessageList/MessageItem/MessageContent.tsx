import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './MessageContent.module.less';

interface MessageContentProps {
  content: string;
  renderAsMarkdown?: boolean;
}

const MessageContent: React.FC<MessageContentProps> = ({ content, renderAsMarkdown = false }) => {
  if (!renderAsMarkdown) {
    return <div className={styles.plainText}>{content}</div>;
  }

  return (
    <div className={styles.markdown}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
};

export default MessageContent;
