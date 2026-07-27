import clsx from 'clsx';
import { CircleAlert } from 'lucide-react';

import { Popover } from '../Popover';
import type { AppPopoverContentProps, AppPopoverHeaderProps, AppPopoverProps } from './index.type';
import styles from './style.module.less';

function AppPopoverHeader({
  variant = 'default',
  icon,
  children,
  className,
  ...props
}: AppPopoverHeaderProps) {
  const resolvedIcon =
    icon === false ? null : (icon ?? (variant === 'danger' ? <CircleAlert size={16} /> : null));

  return (
    <div
      className={clsx(styles.header, variant === 'danger' && styles.dangerHeader, className)}
      {...props}
    >
      {resolvedIcon ? (
        <span className={styles.headerIcon} aria-hidden="true">
          {resolvedIcon}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function AppPopoverContent({
  title,
  variant = 'default',
  bodyPadding = 'default',
  showArrow = false,
  children,
  className,
  classNames,
  ...props
}: AppPopoverContentProps) {
  return (
    <Popover.Content
      className={clsx(styles.content, variant === 'danger' && styles.dangerContent, className)}
      {...props}
    >
      {showArrow ? <Popover.Arrow className={classNames?.arrow} /> : null}
      <Popover.Dialog className={clsx(styles.dialog, classNames?.dialog)}>
        {title != null ? (
          <AppPopoverHeader
            variant={variant}
            className={classNames?.header}
            icon={variant === 'danger' ? undefined : false}
          >
            <Popover.Heading className={clsx(styles.heading, classNames?.heading)}>
              {title}
            </Popover.Heading>
          </AppPopoverHeader>
        ) : null}
        <div
          className={clsx(
            styles.body,
            bodyPadding === 'none' && styles.bodyWithoutPadding,
            classNames?.body
          )}
        >
          {children}
        </div>
      </Popover.Dialog>
    </Popover.Content>
  );
}

function AppPopoverRoot(props: AppPopoverProps) {
  return <Popover {...props} />;
}

export const AppPopover = Object.assign(AppPopoverRoot, {
  Content: AppPopoverContent,
  DeferredContent: Popover.DeferredContent,
  Header: AppPopoverHeader,
  Root: AppPopoverRoot,
  Trigger: Popover.Trigger,
});

export default AppPopover;
