import { clsx } from 'clsx';
import type { ComponentPropsWithRef } from 'react';

import styles from './style.module.scss';

export type InlineInputProps = ComponentPropsWithRef<'input'>;

function InlineInput({ className, ...props }: InlineInputProps) {
  return <input className={clsx(styles.input, className)} {...props} />;
}

export default InlineInput;
