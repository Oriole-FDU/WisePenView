import { memo } from 'react';

import type { WisePenUIMessage } from '@/domains/Chat';
import type { ChatModel } from '@/domains/ChatConfig';

import AssistantMessage from './Assistant';
import UserMessage from './User';

interface MessageProps {
  message: WisePenUIMessage;
  model: ChatModel | null;
  streaming: boolean;
  fullWidth: boolean;
}

function Message({ message, model, streaming, fullWidth }: MessageProps) {
  if (message.role === 'user') return <UserMessage message={message} fullWidth={fullWidth} />;
  return <AssistantMessage message={message} model={model} streaming={streaming} />;
}

export default memo(Message);
