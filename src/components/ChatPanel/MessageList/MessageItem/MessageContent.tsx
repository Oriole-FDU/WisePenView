import React from 'react';

interface MessageContentProps {
  content: string;
}

const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
  return (
    <div>
      {/* 暂时直接渲染文本，未来替换为 <ReactMarkdown>{content}</ReactMarkdown> */}
      {content}
    </div>
  );
};

export default MessageContent;