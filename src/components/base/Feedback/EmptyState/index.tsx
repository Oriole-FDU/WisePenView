import { CircleHelp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import ContentState from '../ContentState';
import type { EmptyStateProps } from './index.type';

function EmptyState({
  action,
  className,
  description,
  icon,
  showIcon = true,
  size,
  title,
}: EmptyStateProps) {
  const { t } = useTranslation('common');

  return (
    <ContentState
      action={action}
      className={className}
      description={description}
      icon={
        showIcon
          ? (icon ?? (
              <CircleHelp
                size={size === 'compact' ? 16 : 20}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            ))
          : undefined
      }
      size={size}
      title={title ?? t('feedback.empty')}
      tone="neutral"
    />
  );
}

export type { EmptyStateProps } from './index.type';
export default EmptyState;
