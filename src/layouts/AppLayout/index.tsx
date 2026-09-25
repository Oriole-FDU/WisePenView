import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import AppSidebar from '@/components/business/Sidebar/AppSidebar';
import { APP_MAIN_MIN_WIDTH } from '@/constants/layoutScale';
import { useAppNavigation } from '@/layouts/AppNavigation/_context';
import MainShell from '@/layouts/MainShell';
import RouteOutletBoundary from '@/layouts/RouteOutletBoundary';
import { COLOR_SCHEME_LOGO_SRC, useAppTheme, useColorScheme } from '@/theme';

import styles from './style.module.less';

const APP_LAYOUT_PANEL_GROUP_ID = 'app-layout-panels';

function AppLayout() {
  const { t } = useTranslation('shell');
  const appNavigation = useAppNavigation();
  const { resolvedTheme } = useAppTheme();
  const { colorScheme } = useColorScheme();
  const logoSrc = COLOR_SCHEME_LOGO_SRC[colorScheme][resolvedTheme];

  return (
    <MainShell
      panelGroupId={APP_LAYOUT_PANEL_GROUP_ID}
      sidebarAriaLabel={t('navigation.appSidebar')}
      mainMinWidth={APP_MAIN_MIN_WIDTH}
      mobileHeaderTitle={
        <img className={styles.mobileLogo} src={logoSrc} alt="WisePen" draggable={false} />
      }
      renderSidebar={({ collapsed, motionPhase, onToggle }) => (
        <AppSidebar
          canGoBack={appNavigation.canGoBack}
          canGoForward={appNavigation.canGoForward}
          collapsed={collapsed}
          motionPhase={motionPhase}
          onGoBack={appNavigation.goBack}
          onGoForward={appNavigation.goForward}
          onToggle={onToggle}
        />
      )}
      renderDrawerSidebar={({ onNavigate }) => (
        <AppSidebar
          canGoBack={false}
          canGoForward={false}
          onGoBack={() => undefined}
          onGoForward={() => undefined}
          onToggle={onNavigate}
          onNavigate={onNavigate}
        />
      )}
    >
      <RouteOutletBoundary>
        <Outlet />
      </RouteOutletBoundary>
    </MainShell>
  );
}

export default AppLayout;
