import { useInterval } from 'ahooks';
import { clsx } from 'clsx';
import { CalendarCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import { AppButton, AppIconButton } from '@/components/base/Button';
import { useUserService } from '@/domains';
import type { UserTaskCheckInResult, UserTaskRewardPreview } from '@/domains/User';
import { useApi } from '@/hooks/useApi';

import styles from './style.module.less';

const DEFAULT_REWARD_PREVIEW: UserTaskRewardPreview = {
  rewardType: 'TOKEN',
  minRewardAmount: 100_000,
  maxRewardAmount: 1_000_000,
  rewardStepAmount: 100_000,
};

const getRandomRewardAmount = (preview: UserTaskRewardPreview): number => {
  const min = preview.minRewardAmount ?? DEFAULT_REWARD_PREVIEW.minRewardAmount!;
  const max = Math.max(preview.maxRewardAmount ?? min, min);
  const step = 1; // 展示的随机数不需要严格按照 step 取整，避免出现过于规律的数字
  const minUnit = Math.ceil(min / step);
  const maxUnit = Math.floor(max / step);
  const unit = minUnit + Math.floor(Math.random() * (maxUnit - minUnit + 1));
  return unit * step;
};

const getRollingMemes = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
};

const getRandomItem = (items: string[]): string => items[Math.floor(Math.random() * items.length)]!;

const getRandomRewardText = (preview: UserTaskRewardPreview, rollingMemes: string[]): string => {
  if (Math.random() < 0.2) {
    return getRandomItem(rollingMemes);
  }
  return getRandomRewardAmount(preview).toLocaleString();
};

function UserCheckIn() {
  const { t } = useTranslation(['shell', 'common']);
  const userService = useUserService();
  const rollingMemes = getRollingMemes(t('checkIn.rollingMemes', { returnObjects: true }));
  const [isOpen, setIsOpen] = useState(false);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [rewardPreview, setRewardPreview] = useState<UserTaskRewardPreview>(DEFAULT_REWARD_PREVIEW);
  const [displayText, setDisplayText] = useState(() =>
    getRandomRewardText(DEFAULT_REWARD_PREVIEW, rollingMemes)
  );
  const [result, setResult] = useState<UserTaskCheckInResult | null>(null);

  const { loading: loadingStatus } = useApi(
    async () => {
      const task = (await userService.listTaskStatus()).find(
        (item) => item.taskCode === 'DAILY_CHECK_IN'
      );
      return task;
    },
    {
      onSuccess: (task) => {
        setCanCheckIn(Boolean(task?.enabled && task.canComplete));
        if (task?.rewardPreview) {
          setRewardPreview(task.rewardPreview);
          setDisplayText(getRandomRewardText(task.rewardPreview, rollingMemes));
        }
      },
    }
  );

  const { loading: checkingIn, run: runCheckIn } = useApi(async () => userService.dailyCheckIn(), {
    manual: true,
    onSuccess: (nextResult) => {
      setResult(nextResult);
      setCanCheckIn(false);
    },
  });

  useInterval(
    () => {
      setDisplayText(getRandomRewardText(rewardPreview, rollingMemes));
    },
    isOpen && !result && !checkingIn ? 120 : undefined
  );

  const handleOpen = () => {
    setResult(null);
    setIsOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !checkingIn) {
      setResult(null);
      setIsOpen(false);
    }
  };

  const rewardUnit = rewardPreview.rewardType === 'COIN' ? t('checkIn.coin') : t('checkIn.token');
  const shownReward = result ? result.rewardAmount.toLocaleString() : displayText;
  const alreadyCheckedIn = !canCheckIn && !result;
  const guaranteeAmount = rewardPreview.maxRewardAmount ?? DEFAULT_REWARD_PREVIEW.maxRewardAmount!;
  const daysUntilGuarantee =
    result == null ? 0 : Math.max(result.cycleCount - result.cycleProgress, 0);

  return (
    <>
      <span className={styles.trigger}>
        <AppIconButton
          icon={<CalendarCheck size={16} aria-hidden="true" />}
          label={t('checkIn.openAria')}
          variant="ghost"
          size="sm"
          isDisabled={loadingStatus}
          tooltip={{ content: t('checkIn.title'), placement: 'top' }}
          onPress={handleOpen}
        />
        {canCheckIn ? <span className={styles.pendingDot} aria-hidden="true" /> : null}
      </span>

      <AppModal
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        title={t('checkIn.title')}
        size="sm"
        isDismissable={!checkingIn}
        footerClassName={styles.footer}
        actions={
          result || alreadyCheckedIn ? (
            <AppButton
              variant="primary"
              className={styles.footerButton}
              onPress={() => handleOpenChange(false)}
            >
              {t('actions.close', { ns: 'common' })}
            </AppButton>
          ) : (
            <AppButton
              variant="primary"
              className={styles.footerButton}
              isDisabled={checkingIn}
              aria-busy={checkingIn || undefined}
              onPress={() => runCheckIn()}
            >
              {checkingIn ? t('checkIn.checkingIn') : t('checkIn.confirm')}
            </AppButton>
          )
        }
      >
        <div className={styles.modalBody}>
          <p className={styles.description}>
            {result
              ? t('checkIn.success')
              : alreadyCheckedIn
                ? t('checkIn.checkedInToday')
                : t('checkIn.description')}
          </p>
          {alreadyCheckedIn ? null : (
            <div
              className={clsx(styles.reward, result ? styles.rewardSettled : styles.rewardRolling)}
            >
              <strong className={styles.rewardAmount}>{shownReward}</strong>
              <span className={styles.rewardType}>{rewardUnit}</span>
              {result ? (
                <span className={styles.rewardConfetti} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              ) : null}
            </div>
          )}
          {result ? (
            <div className={styles.result}>
              <span>
                {t('checkIn.guaranteeCountdownPrefix')}
                <strong className={styles.resultValue}>{daysUntilGuarantee}</strong>
                {t('checkIn.guaranteeCountdownSuffix')}
              </span>
              <span>
                {t('checkIn.guaranteeRewardPrefix')}
                <strong className={styles.resultValue}>
                  {guaranteeAmount.toLocaleString()} {rewardUnit}
                </strong>
              </span>
            </div>
          ) : null}
        </div>
      </AppModal>
    </>
  );
}

export default UserCheckIn;
