import type { Model } from '@/components/ChatPanel/index.type';
import type { WisePenUIMessage } from '@/domains/Chat';
import { memo } from 'react';
import AssistantMessage from './Assistant';
import UserMessage from './User';

interface MessageProps {
  message: WisePenUIMessage;
  model: Model | null;
  streaming: boolean;
  fullWidth?: boolean;
}

function Message({ message, model, streaming, fullWidth = false }: MessageProps) {
  if (message.role === 'user') return <UserMessage message={message} fullWidth={fullWidth} />;
  return <AssistantMessage message={message} model={model} streaming={streaming} />;
}

export default memo(Message);
