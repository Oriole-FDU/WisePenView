import { clsx } from 'clsx';

import type { ErrorPageActionsProps } from './index.type';
import styles from './style.module.scss';

/** 错误页操作区：居中换行的按钮行。 */
function ErrorPageActions({ children, className }: ErrorPageActionsProps) {
  return <div className={clsx(styles.actions, className)}>{children}</div>;
}

export default ErrorPageActions;
