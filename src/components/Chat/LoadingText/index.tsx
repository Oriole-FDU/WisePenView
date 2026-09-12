import { cn } from '@/utils/cn';
import type { CSSProperties } from 'react';
import type { LoadingTextProps } from './index.type';
import styles from './style.module.less';

type LoadingTextStyle = CSSProperties & {
  '--loading-text-duration'?: string;
};

function LoadingText({
  as: Component = 'span',
  children,
  className,
  duration,
  tone = 'muted',
  size = 'inherit',
  animated = true,
  role = 'status',
  'aria-live': ariaLive = 'polite',
  style,
  ...props
}: LoadingTextProps) {
  const mergedStyle: LoadingTextStyle | undefined = duration
    ? { ...style, '--loading-text-duration': duration }
    : style;

  return (
    <Component
      className={cn(styles.root, className)}
      data-tone={tone}
      data-size={size}
      data-animated={animated ? 'true' : 'false'}
      role={role}
      aria-live={ariaLive}
      style={mergedStyle}
      {...props}
    >
      {children}
    </Component>
  );
}

export type { LoadingTextProps };
export default LoadingText;
