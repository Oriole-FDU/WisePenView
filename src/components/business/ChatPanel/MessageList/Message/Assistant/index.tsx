import { isTextUIPart } from 'ai';
import { Brain, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import CopyButton from '@/components/base/Button/CopyButton';
import ProviderLogo from '@/components/business/Icons/ProviderLogo';

import LoadingText from '../../../_common/LoadingText';
import ChatMessage from '../ChatMessage';
import MessageContent from '../Content';
import type { AssistantMessageProps } from './index.type';
import ProcessTrace from './ProcessTrace';
import styles from './style.module.less';
import ToolApprovalDialog from './ToolApprovalDialog';
import { buildAssistantSegments, findPendingApprovalPart } from './traceModel';

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
  const segments = buildAssistantSegments(message.parts, {
    streaming,
    reasoningDurationSeconds: message.metadata?.reasoningDurationSeconds,
  });
  const showGeneratingHint = streaming && segments.length === 0;
  const pendingApproval = findPendingApprovalPart(message.parts, approvalDecisions);
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
        {segments.map((segment) =>
          segment.kind === 'text' ? (
            <ChatMessage.Content key={segment.key} className={styles.text}>
              <MessageContent content={segment.text} markdown streaming={segment.streaming} />
            </ChatMessage.Content>
          ) : (
            <ProcessTrace key={segment.key} items={segment.items} streaming={streaming} />
          )
        )}

        {showGeneratingHint ? (
          <div className={styles.generating}>
            <Brain size={14} aria-hidden="true" className={styles.generatingIcon} />
            <LoadingText tone="muted" size="sm">
              {t('message.reasoning.loading')}
            </LoadingText>
          </div>
        ) : null}

        {!streaming && textContent ? (
          <ChatMessage.Actions>
            <CopyButton text={textContent} />
            <AppIconButton
              icon={<ThumbsUp size={17} aria-hidden="true" />}
              label={t('message.like')}
              className={styles.actionButton}
              tooltip={{ delay: 0 }}
            />
            <AppIconButton
              icon={<ThumbsDown size={17} aria-hidden="true" />}
              label={t('message.dislike')}
              className={styles.actionButton}
              tooltip={{ delay: 0 }}
            />
          </ChatMessage.Actions>
        ) : null}

        {pendingApproval ? (
          <ToolApprovalDialog
            part={pendingApproval}
            submitting={approvalSubmitting}
            onDecision={(approved) => onApprovalDecision(pendingApproval.toolCallId, approved)}
          />
        ) : null}
      </ChatMessage.Body>
    </ChatMessage.Assistant>
  );
}

export default AssistantMessage;
