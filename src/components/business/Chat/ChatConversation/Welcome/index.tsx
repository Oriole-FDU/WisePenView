import { useTranslation } from 'react-i18next';

import { useUserService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { COLOR_SCHEME_ICON_SRC, useColorScheme } from '@/theme';

import styles from './style.module.less';

function Welcome() {
  const { t } = useTranslation('chat');
  const { colorScheme } = useColorScheme();
  const userService = useUserService();
  const { data: user } = useApi(() => userService.getUserInfo());
  const name = user?.nickname?.trim() || user?.username?.trim();

  return (
    <div className={styles.wrapper}>
      <img
        className={styles.logo}
        src={COLOR_SCHEME_ICON_SRC[colorScheme]}
        alt=""
        draggable={false}
      />
      <h1 className={styles.title}>
        {name ? t('message.welcome.titleWithName', { name }) : t('message.welcome.title')}
      </h1>
    </div>
  );
}

export default Welcome;
