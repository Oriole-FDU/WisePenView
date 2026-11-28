import Markdown from '@/components/base/Markdown';
import { useNoteLinkResolver } from '@/components/business/Chat/_hooks/useNoteLinkResolver';

import type { MessageContentProps } from './index.type';
import styles from './style.module.scss';

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
