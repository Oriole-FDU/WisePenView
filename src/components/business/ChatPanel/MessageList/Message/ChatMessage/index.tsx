import { cn } from '@/utils/cn';

import type {
  ChatMessageActionsProps,
  ChatMessageAssistantProps,
  ChatMessageAvatarProps,
  ChatMessageBodyProps,
  ChatMessageBubbleProps,
  ChatMessageContentProps,
  ChatMessageMetaProps,
  ChatMessageUserProps,
} from './index.type';
import styles from './style.module.less';

function ChatMessageAssistant({ className, children, ...props }: ChatMessageAssistantProps) {
  return (
    <div data-role="assistant" className={cn(styles.assistant, className)} {...props}>
      {children}
    </div>
  );
}

function ChatMessageUser({ className, children, ...props }: ChatMessageUserProps) {
  return (
    <div data-role="user" className={cn(styles.user, className)} {...props}>
      <div className={styles.userInner}>{children}</div>
    </div>
  );
}

function ChatMessageAvatar({ className, children, ...props }: ChatMessageAvatarProps) {
  return (
    <div
      className={cn(styles.avatar, className)}
      aria-hidden={props['aria-hidden'] ?? true}
      {...props}
    >
      {children}
    </div>
  );
}

function ChatMessageMeta({ className, name, children, ...props }: ChatMessageMetaProps) {
  return (
    <div className={cn(styles.meta, className)} {...props}>
      {name ? <span className={styles.metaName}>{name}</span> : null}
      {children}
    </div>
  );
}

function ChatMessageBody({ className, children, ...props }: ChatMessageBodyProps) {
  return (
    <div className={cn(styles.body, className)} {...props}>
      {children}
    </div>
  );
}

function ChatMessageBubble({ className, children, ...props }: ChatMessageBubbleProps) {
  return (
    <div className={cn(styles.bubble, className)} {...props}>
      {children}
    </div>
  );
}

function ChatMessageContent({ className, children, ...props }: ChatMessageContentProps) {
  return (
    <div className={cn(styles.content, className)} {...props}>
      {children}
    </div>
  );
}

function ChatMessageActions({ className, children, ...props }: ChatMessageActionsProps) {
  return (
    <div className={cn(styles.actions, className)} {...props}>
      {children}
    </div>
  );
}

const ChatMessage = {
  Assistant: ChatMessageAssistant,
  User: ChatMessageUser,
  Avatar: ChatMessageAvatar,
  Meta: ChatMessageMeta,
  Body: ChatMessageBody,
  Bubble: ChatMessageBubble,
  Content: ChatMessageContent,
  Actions: ChatMessageActions,
};

export type {
  ChatMessageActionsProps,
  ChatMessageAssistantProps,
  ChatMessageAvatarProps,
  ChatMessageBodyProps,
  ChatMessageBubbleProps,
  ChatMessageContentProps,
  ChatMessageMetaProps,
  ChatMessageUserProps,
} from './index.type';
export default ChatMessage;
