import Markdown from '@/components/base/Markdown';

import type { MessageContentProps } from './index.type';
import styles from './style.module.scss';
import { useNoteLinkResolver } from './useNoteLinkResolver';

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
