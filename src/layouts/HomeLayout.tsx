import { Outlet } from 'react-router-dom';

import LandingNavbar from '@/components/LandingNavbar';
import styles from './HomeLayout.module.less';

function HomeLayout() {
  return (
    <div className={styles.root}>
      <div className={styles.navShell}>
        <LandingNavbar activeKey="1" />
      </div>

      <div className={styles.outlet}>
        <Outlet />
      </div>

      <footer className={styles.footer}>
        <div className={styles.waveWrap} aria-hidden>
          <svg
            className={styles.waveSvg}
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            preserveAspectRatio="none"
            x="0px"
            y="0px"
            viewBox="0 0 2560 100"
            xmlSpace="preserve"
          >
            <polygon points="2560 0 2560 100 0 100" />
          </svg>
        </div>

        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div className={styles.footerBrandText}>WisePen</div>
          </div>

          <div className={styles.divider} role="separator" aria-hidden />

          <div className={styles.copyright}>
            <div>Copyright © 2026. Fudan University & Oriole Software All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomeLayout;
