import type { Model } from '@/components/ChatPanel/index.type';
import ProviderLogo from '@/components/Icons/ProviderLogo';
import type { WisePenUIMessage } from '@/domains/Chat';
import { Button, Tooltip } from '@heroui/react';
import { isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import ChatMessage from '../ChatMessage';
import MessageContent from '../Content';
import CopyButton, { MESSAGE_ACTION_ICON_SIZE } from '../CopyButton';
import actionStyles from '../CopyButton.module.less';
import MessageLoader from '../Loader';
import ReasoningBlock from './ReasoningBlock';
import ToolCallBlock from './ToolCallBlock';
import styles from './style.module.less';

interface AssistantMessageProps {
  message: WisePenUIMessage;
  model: Model | null;
  streaming: boolean;
}

function AssistantMessage({ message, model, streaming }: AssistantMessageProps) {
  const textContent = message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join('');
  const reasoningParts = message.parts.filter(isReasoningUIPart);
  const reasoningText = reasoningParts.map((part) => part.text).join('\n\n');
  const firstReasoningIndex = message.parts.findIndex(isReasoningUIPart);
  const isReasoningStreaming = reasoningParts.some((part) => part.state === 'streaming');
  const hasVisibleContent = message.parts.some((part) => {
    if (isTextUIPart(part)) return Boolean(part.text);
    if (isReasoningUIPart(part)) return Boolean(part.text) || part.state === 'streaming';
    if (isToolUIPart(part)) return true;
    return false;
  });
  const showLoadingSkeleton = streaming && !hasVisibleContent;
  // TODO: 后端历史透出 metadata.provider / modelName 后优先用消息级快照
  const displayProvider = model?.provider || 'openai';
  const displayModelName = model?.name || 'AI 助手';

  return (
    <ChatMessage.Assistant>
      <div className={styles.header}>
        <ChatMessage.Avatar>
          <ProviderLogo provider={displayProvider} size={24} />
        </ChatMessage.Avatar>
        <ChatMessage.Meta name={displayModelName} />
      </div>

      <ChatMessage.Body>
        {message.parts.map((part, index) => {
          const key = isToolUIPart(part) ? part.toolCallId : `${part.type}-${index}`;
          if (isTextUIPart(part)) {
            if (!part.text) return null;
            return (
              <ChatMessage.Content key={key} className={styles.text}>
                <MessageContent
                  content={part.text}
                  markdown
                  streaming={streaming && part.state !== 'done'}
                />
              </ChatMessage.Content>
            );
          }
          if (isReasoningUIPart(part)) {
            if (index !== firstReasoningIndex) return null;
            return (
              <ReasoningBlock
                key={key}
                content={reasoningText}
                loading={isReasoningStreaming}
                durationSeconds={message.metadata?.reasoningDurationSeconds}
              />
            );
          }
          if (isToolUIPart(part)) return <ToolCallBlock key={key} part={part} />;
          return null;
        })}

        {showLoadingSkeleton ? <MessageLoader.Skeleton /> : null}

        {!streaming && textContent ? (
          <ChatMessage.Actions>
            <CopyButton text={textContent} />
            <Tooltip delay={0}>
              <Button
                variant="ghost"
                isIconOnly
                size="sm"
                className={actionStyles.copyButton}
                aria-label="点赞"
              >
                <ThumbsUp size={MESSAGE_ACTION_ICON_SIZE} />
              </Button>
              <Tooltip.Content>点赞</Tooltip.Content>
            </Tooltip>
            <Tooltip delay={0}>
              <Button
                variant="ghost"
                isIconOnly
                size="sm"
                className={actionStyles.copyButton}
                aria-label="点踩"
              >
                <ThumbsDown size={MESSAGE_ACTION_ICON_SIZE} />
              </Button>
              <Tooltip.Content>点踩</Tooltip.Content>
            </Tooltip>
          </ChatMessage.Actions>
        ) : null}
      </ChatMessage.Body>
    </ChatMessage.Assistant>
  );
}

export default AssistantMessage;
