import { useNavigate } from 'react-router-dom';

import logoImg from '@/assets/images/logo-icon.png';
import type { LandingNavbarProps } from './index.type';
import styles from './style.module.less';

function LandingNavbar({ activeKey }: LandingNavbarProps) {
  const navigate = useNavigate();
  const navItems = [
    { key: '1', label: '首页', path: '/' },
    { key: '2', label: '注册', path: '/register' },
    { key: '3', label: '登录', path: '/login' },
  ];

  return (
    <div className={styles.bar}>
      <div className={styles.brand}>
        <img src={logoImg} alt="WisePen" className={styles.logo} />
        <span className={styles.brandText}>WisePen</span>
      </div>
      <div className={styles.navWrap} aria-label="首页导航">
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
