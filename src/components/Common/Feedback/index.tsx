import { Spinner } from '@heroui/react';
import { CircleAlert, CircleCheck, CircleHelp, Info, SearchX, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './style.module.less';

type FeedbackStatus = 'success' | 'info' | 'warning' | 'error' | '404' | '403' | '500';
type SpinSize = 'small' | 'default' | 'large';
type HeroSpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

const PRESENTED_IMAGE_SIMPLE = 'PRESENTED_IMAGE_SIMPLE' as const;
type EmptyImage = typeof PRESENTED_IMAGE_SIMPLE | ReactNode;

const SPIN_SIZE_MAP: Record<SpinSize, HeroSpinnerSize> = {
  small: 'sm',
  default: 'md',
  large: 'lg',
};

interface LoadingStateProps {
  label?: ReactNode;
  size?: HeroSpinnerSize;
  className?: string;
}

interface SpinProps {
  size?: SpinSize;
  spinning?: boolean;
  tip?: ReactNode;
  children?: ReactNode;
  className?: string;
}

interface EmptyStateProps {
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
}

interface EmptyProps {
  description?: ReactNode;
  image?: EmptyImage;
  className?: string;
}

interface ResultStateProps {
  status?: FeedbackStatus;
  title: ReactNode;
  subTitle?: ReactNode;
  extra?: ReactNode;
  children?: ReactNode;
  className?: string;
}

const STATUS_ICON_MAP = {
  success: CircleCheck,
  info: Info,
  warning: CircleAlert,
  error: CircleAlert,
  '404': SearchX,
  '403': ShieldAlert,
  '500': CircleAlert,
} satisfies Record<FeedbackStatus, typeof CircleAlert>;

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function LoadingState({ label, size = 'md', className }: LoadingStateProps) {
  return (
    <div className={cx(styles.loadingState, className)} aria-busy="true" aria-live="polite">
      <Spinner size={size} />
      {label ? <span className={styles.loadingLabel}>{label}</span> : null}
    </div>
  );
}

function Spin({ size = 'default', spinning = true, tip, children, className }: SpinProps) {
  const spinner = <Spinner size={SPIN_SIZE_MAP[size]} />;

  if (children !== undefined) {
    return (
      <div className={cx(styles.spinWrapper, !spinning && styles.spinWrapperIdle, className)}>
        {children}
        {spinning ? (
          <div className={styles.spinOverlay} aria-busy="true" aria-live="polite">
            <div className={styles.spinOverlayContent}>
              {spinner}
              {tip ? <span className={styles.loadingLabel}>{tip}</span> : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (tip) {
    return (
      <div className={cx(styles.loadingState, className)} aria-busy="true" aria-live="polite">
        {spinner}
        <span className={styles.loadingLabel}>{tip}</span>
      </div>
    );
  }

  return (
    <span className={cx(styles.spinInline, className)} aria-busy="true" aria-live="polite">
      {spinner}
    </span>
  );
}

function EmptyState({ title = '暂无数据', description, className }: EmptyStateProps) {
  return (
    <div className={cx(styles.emptyState, className)}>
      <CircleHelp className={styles.emptyIcon} size={28} aria-hidden />
      <div className={styles.emptyTitle}>{title}</div>
      {description ? <div className={styles.emptyDescription}>{description}</div> : null}
    </div>
  );
}

function Empty({ description, image, className }: EmptyProps) {
  const isSimple = image === PRESENTED_IMAGE_SIMPLE;
  const showDefaultIcon = image === undefined;
  const showCustomImage =
    image !== undefined && image !== PRESENTED_IMAGE_SIMPLE && typeof image !== 'string';

  return (
    <div className={cx(styles.emptyState, isSimple && styles.emptyStateSimple, className)}>
      {showCustomImage ? image : null}
      {showDefaultIcon ? <CircleHelp className={styles.emptyIcon} size={28} aria-hidden /> : null}
      {description ? <div className={styles.emptyTitle}>{description}</div> : null}
    </div>
  );
}

Empty.PRESENTED_IMAGE_SIMPLE = PRESENTED_IMAGE_SIMPLE;

function ResultState({
  status = 'info',
  title,
  subTitle,
  extra,
  children,
  className,
}: ResultStateProps) {
  const Icon = STATUS_ICON_MAP[status];

  return (
    <section className={cx(styles.resultState, styles[`status${status}`], className)}>
      <Icon className={styles.resultIcon} size={56} strokeWidth={1.7} aria-hidden />
      <h1 className={styles.resultTitle}>{title}</h1>
      {subTitle ? <p className={styles.resultSubtitle}>{subTitle}</p> : null}
      {extra ? <div className={styles.resultExtra}>{extra}</div> : null}
      {children ? <div className={styles.resultContent}>{children}</div> : null}
    </section>
  );
}

export { Empty, EmptyState, LoadingState, ResultState, Spin };
export type { EmptyProps, EmptyStateProps, LoadingStateProps, ResultStateProps, SpinProps };
