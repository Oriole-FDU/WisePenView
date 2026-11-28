import { clsx } from 'clsx';

import type { InlineTextAreaProps } from './index.type';
import styles from './style.module.scss';

function InlineTextArea({ className, ...props }: InlineTextAreaProps) {
  return <textarea className={clsx(styles.textarea, className)} {...props} />;
}

export default InlineTextArea;

export type { InlineTextAreaProps } from './index.type';
