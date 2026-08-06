import { useDesktopWindowState } from '@/hooks/useDesktopWindowState';
import LandingNavbar from '@/layouts/Home/_components/LandingNavbar';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import styles from './HomeLayout.module.less';

/** 滚动到门户区块（SPA 内 .root 为滚动容器，需 scrollIntoView 而非 #hash） */
function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function HomeLayout() {
  const { t } = useTranslation('shell');
  const desktopWindow = useDesktopWindowState();
  const titleBarInsetStart =
    desktopWindow.hasTitleBarInset && desktopWindow.titleBarInsetSide === 'start';
  const titleBarInsetEnd =
    desktopWindow.hasTitleBarInset && desktopWindow.titleBarInsetSide === 'end';

  const footerLinks = [
    { id: 'ai', label: t('home.nav.features') },
    { id: 'knowledge', label: t('home.nav.knowledge') },
    { id: 'team', label: t('home.nav.team') },
    { id: 'scenes', label: t('home.nav.scenes') },
    { id: 'faq', label: t('home.nav.faq') },
  ];

  return (
    <div className={styles.root}>
      <div
        className={clsx(
          styles.navShell,
          desktopWindow.isDesktop && styles.desktopNavShell,
          titleBarInsetStart && styles.titleBarInsetStart,
          titleBarInsetEnd && styles.titleBarInsetEnd
        )}
      >
        <LandingNavbar />
      </div>

      <div className={styles.outlet}>
        <Outlet />
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div className={styles.footerBrandRow}>
              <span className={styles.brandMark} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <div className={styles.footerBrandText}>WisePen</div>
            </div>
            <p className={styles.footerTagline}>{t('home.footer.tagline')}</p>
          </div>

          <div className={styles.footerLinks}>
            {footerLinks.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.footerLink}
                onClick={() => scrollToSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className={styles.footerBottom}>
            <span>{t('home.footer.copyright')}</span>
            <div>
              <a className={styles.footerMetaLink} href="#">
                {t('home.footer.privacy')}
              </a>
              <a className={styles.footerMetaLink} href="#">
                {t('home.footer.terms')}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomeLayout;
