import { useTranslation } from 'react-i18next';

import { useUserService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { COLOR_SCHEME_ICON_SRC, useColorScheme } from '@/theme';

import type { WelcomeTitleProps } from './index.type';
import styles from './style.module.scss';

/** 默认问候标题区（Logo + 文案）；字段来自 WelcomeScreenConfig.hero，也可由 Host 的 hero 插槽整体替换。 */
function WelcomeTitle({ iconSrc, title, greetWithUserName = true }: WelcomeTitleProps) {
  const { t } = useTranslation('chat');
  const { colorScheme } = useColorScheme();
  const userService = useUserService();
  const { data: user } = useApi(() => userService.getUserInfo());
  const name = user?.nickname?.trim() || user?.username?.trim();

  const resolvedIconSrc = iconSrc === undefined ? COLOR_SCHEME_ICON_SRC[colorScheme] : iconSrc;
  const resolvedTitle =
    title ??
    (greetWithUserName && name
      ? t('message.welcome.titleWithName', { name })
      : t('message.welcome.title'));

  return (
    <div className={styles.wrapper}>
      {resolvedIconSrc ? (
        <img className={styles.logo} src={resolvedIconSrc} alt="" draggable={false} />
      ) : null}
      <h1 className={styles.title}>{resolvedTitle}</h1>
    </div>
  );
}

export default WelcomeTitle;
