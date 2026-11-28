import { memo } from 'react';

import type { MessageProps } from './index.type';
import AssistantMessage from './_parts/Assistant';
import UserMessage from './_parts/User';

function Message({ message, model, streaming, fullWidth }: MessageProps) {
  if (message.role === 'user') return <UserMessage message={message} fullWidth={fullWidth} />;
  return <AssistantMessage message={message} model={model} streaming={streaming} />;
}

export default memo(Message);
