import { isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai';

import type { WisePenUIMessage } from '@/domains/Chat';

/** 判定消息列表是否存在可渲染内容：文本/思考有非空文本，或存在工具调用。 */
export function hasRenderableChatContent(messages: readonly WisePenUIMessage[]): boolean {
  return messages.some((message) =>
    message.parts.some((part) => {
      if (isTextUIPart(part) || isReasoningUIPart(part)) return part.text.trim().length > 0;
      return isToolUIPart(part);
    })
  );
}
