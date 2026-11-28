import { RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import { ErrorState } from '@/components/base/Feedback';

import type { PublicListErrorStateProps } from './index.type';

/** 公开课程与小组列表共用同一套页内失败与恢复入口。 */
function PublicListErrorState({ className, onRetry, title }: PublicListErrorStateProps) {
  const { t } = useTranslation('common');

  return (
    <ErrorState
      className={className}
      title={title}
      action={
        <AppButton variant="primary" size="sm" onPress={onRetry}>
          <RotateCw size={16} aria-hidden />
          {t('actions.retry')}
        </AppButton>
      }
    />
  );
}

export default PublicListErrorState;
