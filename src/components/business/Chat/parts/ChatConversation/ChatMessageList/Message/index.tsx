import { memo } from 'react';

import AssistantMessage from './Assistant';
import type { MessageProps } from './index.type';
import UserMessage from './User';

function Message({ message, model, streaming, fullWidth }: MessageProps) {
  if (message.role === 'user') return <UserMessage message={message} fullWidth={fullWidth} />;
  return <AssistantMessage message={message} model={model} streaming={streaming} />;
}

export default memo(Message);
