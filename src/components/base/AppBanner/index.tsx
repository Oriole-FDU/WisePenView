import { Alert } from '@heroui/react';

import { cn } from '@/utils/cn';

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
    <Alert className={cn(styles.banner, className)} {...props}>
      {icon === false ? null : <Alert.Indicator>{icon}</Alert.Indicator>}
      <Alert.Content className={cn(styles.content, classNames?.content)}>
        {title != null ? <Alert.Title>{title}</Alert.Title> : null}
        {description != null ? <Alert.Description>{description}</Alert.Description> : null}
        {children}
      </Alert.Content>
      {action != null ? (
        <div className={cn(styles.action, classNames?.action)}>{action}</div>
      ) : null}
    </Alert>
  );
}

export default AppBanner;
