import type { ComponentProps, ReactNode } from 'react';

export type ChatMessageAssistantProps = ComponentProps<'div'>;

export type ChatMessageUserProps = ComponentProps<'div'>;

export type ChatMessageAvatarProps = ComponentProps<'div'>;

export interface ChatMessageMetaProps extends ComponentProps<'div'> {
  name?: ReactNode;
}

export type ChatMessageBodyProps = ComponentProps<'div'>;

export type ChatMessageBubbleProps = ComponentProps<'div'>;

export type ChatMessageContentProps = ComponentProps<'div'>;

export type ChatMessageActionsProps = ComponentProps<'div'>;
