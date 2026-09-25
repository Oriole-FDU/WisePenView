import { clsx } from 'clsx';

import styles from './ErrorPageActions.module.less';
import type { ErrorPageActionsProps } from './index.type';

/** 错误页操作区：居中换行的按钮行。 */
function ErrorPageActions({ children, className }: ErrorPageActionsProps) {
  return <div className={clsx(styles.actions, className)}>{children}</div>;
}

export default ErrorPageActions;
