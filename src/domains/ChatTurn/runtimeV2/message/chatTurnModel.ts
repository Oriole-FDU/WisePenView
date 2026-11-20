import { isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai';

import type { WisePenUIMessage } from '../../entity/message';

export function hasRenderableChatContent(messages: readonly WisePenUIMessage[]): boolean {
  return messages.some((message) =>
    message.parts.some((part) => {
      if (isTextUIPart(part) || isReasoningUIPart(part)) return part.text.trim().length > 0;
      return isToolUIPart(part);
    })
  );
}
