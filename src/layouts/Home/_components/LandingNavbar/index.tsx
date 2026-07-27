import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import logoImg from '@/assets/images/logo-icon.png';
import type { LandingNavbarProps } from './index.type';
import styles from './style.module.less';

function LandingNavbar({ activeKey }: LandingNavbarProps) {
  const { t } = useTranslation('shell');
  const navigate = useNavigate();
  const navItems = [
    { key: '1', label: t('home.nav.home'), path: '/' },
    { key: '2', label: t('home.nav.register'), path: '/register' },
    { key: '3', label: t('home.nav.login'), path: '/login' },
  ];

  return (
    <div className={styles.bar}>
      <div className={styles.brand}>
        <img src={logoImg} alt="WisePen" className={styles.logo} />
        <span className={styles.brandText}>WisePen</span>
      </div>
      <div className={styles.navWrap} aria-label={t('home.navAria')}>
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`${styles.navButton} ${activeKey === item.key ? styles.navButtonActive : ''}`}
            aria-current={activeKey === item.key ? 'page' : undefined}
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default LandingNavbar;
