import { TextArea as HeroTextArea } from '@heroui/react';

import { cn } from '@/utils/cn';

import type { TextAreaProps } from './index.type';
import styles from './style.module.less';

function TextArea({ className, variant = 'secondary', ...props }: TextAreaProps) {
  return <HeroTextArea variant={variant} className={cn(styles.textarea, className)} {...props} />;
}

export type { TextAreaProps };
export default TextArea;
