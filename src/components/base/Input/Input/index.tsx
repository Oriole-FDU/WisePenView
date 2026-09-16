import { Input as HeroInput } from '@heroui/react';

import { cn } from '@/utils/cn';

import type { InputProps } from './index.type';
import styles from './style.module.less';

function Input({ className, variant = 'secondary', ...props }: InputProps) {
  return <HeroInput variant={variant} className={cn(styles.input, className)} {...props} />;
}

export type { InputProps };
export default Input;
