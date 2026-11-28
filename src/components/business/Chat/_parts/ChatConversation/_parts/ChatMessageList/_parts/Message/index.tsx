import { memo } from 'react';

import AssistantMessage from './_parts/AssistantMessage';
import UserMessage from './_parts/User';
import type { MessageProps } from './index.type';

function Message({ message, model, streaming, fullWidth }: MessageProps) {
  if (message.role === 'user') return <UserMessage message={message} fullWidth={fullWidth} />;
  return <AssistantMessage message={message} model={model} streaming={streaming} />;
}

export default memo(Message);
