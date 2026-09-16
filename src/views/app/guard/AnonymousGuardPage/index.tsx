import { LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { useAppAuth } from '@/layouts/App/AppAuthContext';
import { COLOR_SCHEME_ICON_SRC, useColorScheme } from '@/theme';

import styles from './style.module.less';

function AnonymousGuardPage() {
  const { t } = useTranslation('shell');
  const navigate = useNavigate();
  const appAuth = useAppAuth();
  const { colorScheme } = useColorScheme();

  return (
    <section className={styles.root} aria-labelledby="anonymous-guard-title">
      <img
        className={styles.logo}
        src={COLOR_SCHEME_ICON_SRC[colorScheme]}
        alt=""
        draggable={false}
      />
      <div className={styles.content}>
        <h1 id="anonymous-guard-title" className={styles.title}>
          {t('anonymous.title')}
        </h1>
        <p className={styles.subtitle}>{t('anonymous.guardHint')}</p>
      </div>
      <AppButton
        variant="primary"
        className={styles.loginButton}
        onPress={() => navigate(appAuth.loginPath)}
      >
        <LogIn size={18} aria-hidden="true" />
        {t('anonymous.login')}
      </AppButton>
    </section>
  );
}

export default AnonymousGuardPage;
