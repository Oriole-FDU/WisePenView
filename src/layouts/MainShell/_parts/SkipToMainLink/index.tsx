import { useTranslation } from 'react-i18next';

import styles from './style.module.scss';

export const MAIN_CONTENT_ID = 'app-main-content';

function SkipToMainLink() {
  const { t } = useTranslation('shell');

  return (
    <a href={`#${MAIN_CONTENT_ID}`} className={styles.skipLink}>
      {t('navigation.skipToMain')}
    </a>
  );
}

export default SkipToMainLink;
