import React, { useEffect, useRef } from 'react';
import MessageItem from './MessageItem';
import Welcome from './Welcome';
import styles from './style.module.less';
import type { Message } from '@/components/ChatPanel/index.type'; // 假设你有这个类型定义

interface MessageListProps {
  messages: Message[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      // 简单的滚动，如果需要平滑滚动且不打扰用户回看，需要更复杂的逻辑
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, messages.length > 0 ? messages[messages.length - 1].content : null]);

  return (
    <div className={styles.container} ref={scrollRef}>
      {messages.length === 0 ? (
        <Welcome />
      ) : (
        <div>
          {messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageList;