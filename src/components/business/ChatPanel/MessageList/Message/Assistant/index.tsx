import { isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import CopyButton, { MESSAGE_ACTION_ICON_SIZE } from '@/components/base/Button/CopyButton';
import ProviderLogo from '@/components/base/Icons/ProviderLogo';
import type { ChatModel, WisePenUIMessage } from '@/domains/Chat';

import ChatMessage from '../ChatMessage';
import MessageContent from '../Content';
import MessageLoaderSkeleton from '../Loader';
import ReasoningBlock from './ReasoningBlock';
import styles from './style.module.less';
import ToolCallBlock from './ToolCallBlock';

interface AssistantMessageProps {
  message: WisePenUIMessage;
  model: ChatModel | null;
  streaming: boolean;
  approvalDecisions: Readonly<Record<string, boolean>>;
  approvalSubmitting: boolean;
  onApprovalDecision: (toolCallId: string, approved: boolean) => void;
}

function AssistantMessage({
  message,
  model,
  streaming,
  approvalDecisions,
  approvalSubmitting,
  onApprovalDecision,
}: AssistantMessageProps) {
  const { t } = useTranslation('chat');
  const textContent = message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join('');
  const lastReasoningIndex = message.parts.reduce(
    (lastIndex, part, index) => (isReasoningUIPart(part) ? index : lastIndex),
    -1
  );
  const hasVisibleContent = message.parts.some((part) => {
    if (isTextUIPart(part)) return Boolean(part.text);
    if (isReasoningUIPart(part)) return Boolean(part.text) || part.state === 'streaming';
    if (isToolUIPart(part)) return true;
    return false;
  });
  const showLoadingSkeleton = streaming && !hasVisibleContent;
  // TODO: 后端历史透出 metadata.provider / modelName 后优先用消息级快照
  const displayProvider = model?.provider || 'openai';
  const displayModelName = model?.name || t('message.assistant');

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
            return (
              <ReasoningBlock
                key={key}
                content={part.text}
                loading={part.state === 'streaming'}
                durationSeconds={
                  index === lastReasoningIndex
                    ? message.metadata?.reasoningDurationSeconds
                    : undefined
                }
              />
            );
          }
          if (isToolUIPart(part)) {
            return (
              <ToolCallBlock
                key={key}
                part={part}
                approvalDecision={approvalDecisions[part.toolCallId]}
                approvalSubmitting={approvalSubmitting}
                onApprovalDecision={(approved) => onApprovalDecision(part.toolCallId, approved)}
              />
            );
          }
          return null;
        })}

        {showLoadingSkeleton ? <MessageLoaderSkeleton /> : null}

        {!streaming && textContent ? (
          <ChatMessage.Actions>
            <CopyButton text={textContent} />
            <AppIconButton
              icon={<ThumbsUp size={MESSAGE_ACTION_ICON_SIZE} aria-hidden="true" />}
              label={t('message.like')}
              className={styles.actionButton}
              tooltip={{ delay: 0 }}
            />
            <AppIconButton
              icon={<ThumbsDown size={MESSAGE_ACTION_ICON_SIZE} aria-hidden="true" />}
              label={t('message.dislike')}
              className={styles.actionButton}
              tooltip={{ delay: 0 }}
            />
          </ChatMessage.Actions>
        ) : null}
      </ChatMessage.Body>
    </ChatMessage.Assistant>
  );
}

export default AssistantMessage;
