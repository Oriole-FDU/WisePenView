import { clsx } from 'clsx';
import { CircleAlert, CircleCheck, Info, SearchX, ShieldAlert } from 'lucide-react';

import { parseErrorMessage } from '@/utils/error/parseErrorMessage';

import type { FeedbackStatus, ResultStateProps } from './index.type';
import styles from './style.module.scss';

const STATUS_ICON_MAP = {
  success: CircleCheck,
  info: Info,
  warning: CircleAlert,
  error: CircleAlert,
  '404': SearchX,
  '403': ShieldAlert,
  '500': CircleAlert,
} satisfies Record<FeedbackStatus, typeof CircleAlert>;

const STATUS_CLASS_MAP = {
  success: styles.success,
  info: undefined,
  warning: styles.warning,
  error: styles.error,
  '404': styles.notFound,
  '403': styles.forbidden,
  '500': styles.serverError,
} satisfies Record<FeedbackStatus, string | undefined>;

function ResultState({
  status = 'info',
  title,
  error,
  subTitle,
  extra,
  children,
  className,
}: ResultStateProps) {
  const Icon = STATUS_ICON_MAP[status];
  const resolvedSubTitle = error == null ? subTitle : parseErrorMessage(error);

  return (
    <section className={clsx(styles.resultState, STATUS_CLASS_MAP[status], className)}>
      <Icon className={styles.icon} size={56} strokeWidth={1.7} aria-hidden="true" />
      <h1 className={styles.title}>{title}</h1>
      {resolvedSubTitle ? <p className={styles.subtitle}>{resolvedSubTitle}</p> : null}
      {extra ? <div className={styles.extra}>{extra}</div> : null}
      {children ? <div className={styles.content}>{children}</div> : null}
    </section>
  );
}

export type { FeedbackStatus, ResultStateProps } from './index.type';
export default ResultState;
