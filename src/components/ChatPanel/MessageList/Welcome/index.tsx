import { Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './style.module.less';

function Welcome() {
  const { t } = useTranslation('chat');
  return (
    <div className={styles.wrapper}>
      <Bot className={styles.icon} aria-hidden="true" />
      <div className={styles.title}>{t('message.welcome.title')}</div>
      <div className={styles.subtitle}>{t('message.welcome.subtitle')}</div>
    </div>
  );
}

export default Welcome;
