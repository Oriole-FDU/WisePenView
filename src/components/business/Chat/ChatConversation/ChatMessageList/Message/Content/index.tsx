import Markdown from '@/components/base/Markdown';

import styles from './style.module.scss';
import { useNoteLinkResolver } from './useNoteLinkResolver';

interface MessageContentProps {
  content: string;
  markdown?: boolean;
  streaming?: boolean;
}

function MessageContent({ content, markdown = false, streaming = false }: MessageContentProps) {
  const noteLinkResolver = useNoteLinkResolver();
  if (markdown) {
    return (
      <Markdown
        content={content}
        streaming={streaming}
        linkMode="external"
        resourceResolver={noteLinkResolver}
      />
    );
  }
  return <div className={styles.plainText}>{content}</div>;
}

export default MessageContent;
