import { clsx } from 'clsx';
import type { ComponentPropsWithRef } from 'react';

import styles from './style.module.scss';

export type InlineTextAreaProps = ComponentPropsWithRef<'textarea'>;

function InlineTextArea({ className, ...props }: InlineTextAreaProps) {
  return <textarea className={clsx(styles.textarea, className)} {...props} />;
}

export default InlineTextArea;
