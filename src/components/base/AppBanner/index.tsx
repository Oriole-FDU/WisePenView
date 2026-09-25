import { Alert } from '@heroui/react';
import { clsx } from 'clsx';

import type { AppBannerProps } from './index.type';
import styles from './style.module.less';

function AppBanner({
  title,
  description,
  action,
  icon,
  children,
  className,
  classNames,
  ...props
}: AppBannerProps) {
  return (
    <Alert className={clsx(styles.banner, className)} {...props}>
      {icon === false ? null : <Alert.Indicator>{icon}</Alert.Indicator>}
      <Alert.Content className={clsx(styles.content, classNames?.content)}>
        {title != null ? <Alert.Title>{title}</Alert.Title> : null}
        {description != null ? <Alert.Description>{description}</Alert.Description> : null}
        {children}
      </Alert.Content>
      {action != null ? (
        <div className={clsx(styles.action, classNames?.action)}>{action}</div>
      ) : null}
    </Alert>
  );
}

export default AppBanner;
