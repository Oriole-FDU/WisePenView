import { clsx } from 'clsx';

import type { InlineInputProps } from './index.type';
import styles from './style.module.scss';

function InlineInput({ className, ...props }: InlineInputProps) {
  return <input className={clsx(styles.input, className)} {...props} />;
}

export default InlineInput;

export type { InlineInputProps } from './index.type';
