import React from 'react';
import UserMessage from './UserMessage';
import AiMessage from './AiMessage';
import type { Message } from '@/components/ChatPanel/index.type';

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  if (message.role === 'user') {
    return <UserMessage message={message} />;
  }
  
  return <AiMessage message={message} />;
};

export default MessageItem;