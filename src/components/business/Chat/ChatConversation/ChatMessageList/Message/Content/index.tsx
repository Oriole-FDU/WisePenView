import Markdown from '@/components/base/Markdown';
import { useNoteLinkResolver } from '@/components/business/Chat/_controllers/useNoteLinkResolver';

import styles from './style.module.scss';

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
