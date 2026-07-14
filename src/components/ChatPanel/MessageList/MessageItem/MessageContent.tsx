import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MarkdownPreBlock from './MarkdownPreBlock';
import styles from './MessageContent.module.less';

interface MessageContentProps {
  content: string;
  renderAsMarkdown?: boolean;
}

function MessageContent({ content, renderAsMarkdown = false }: MessageContentProps) {
  if (!renderAsMarkdown) {
    return <div className={styles.plainText}>{content}</div>;
  }

  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <MarkdownPreBlock>{children}</MarkdownPreBlock>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MessageContent;
