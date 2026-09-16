import Markdown from '@/components/base/Markdown';

import styles from './style.module.less';

interface MessageContentProps {
  content: string;
  markdown?: boolean;
  streaming?: boolean;
}

function MessageContent({ content, markdown = false, streaming = false }: MessageContentProps) {
  if (markdown) return <Markdown content={content} streaming={streaming} linkMode="external" />;
  return <div className={styles.plainText}>{content}</div>;
}

export default MessageContent;
