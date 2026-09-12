import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

export type LoadingTextTone = 'muted' | 'default' | 'accent';
export type LoadingTextSize = 'xs' | 'sm' | 'inherit';
export type LoadingTextAs = Extract<ElementType, 'span' | 'div' | 'p'>;

export interface LoadingTextProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  as?: LoadingTextAs;
  children: ReactNode;
  tone?: LoadingTextTone;
  size?: LoadingTextSize;
  animated?: boolean;
  duration?: string;
}
