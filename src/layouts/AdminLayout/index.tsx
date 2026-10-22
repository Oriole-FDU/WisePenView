import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import AdminSidebar from '@/components/business/Sidebar/AdminSidebar';
import { MAIN_MIN_WIDTH } from '@/constants/layoutScale';
import MainShell from '@/layouts/MainShell';
import RouteOutletBoundary from '@/layouts/RouteOutletBoundary';

import styles from './style.module.scss';

const ADMIN_LAYOUT_PANEL_GROUP_ID = 'admin-layout-panels';

function AdminLayout() {
  const { t } = useTranslation('shell');

  return (
    <MainShell
      panelGroupId={ADMIN_LAYOUT_PANEL_GROUP_ID}
      sidebarAriaLabel={t('navigation.adminSidebar')}
      mainMinWidth={MAIN_MIN_WIDTH}
      mainContentScroll
      mobileHeaderTitle={<span className={styles.mobileTitle}>WisePen Admin</span>}
      renderSidebar={({ collapsed, motionPhase, onToggle }) => (
        <AdminSidebar collapsed={collapsed} motionPhase={motionPhase} onToggle={onToggle} />
      )}
      renderDrawerSidebar={({ onNavigate }) => <AdminSidebar onToggle={onNavigate} />}
    >
      <RouteOutletBoundary>
        <Outlet />
      </RouteOutletBoundary>
    </MainShell>
  );
}

export default AdminLayout;
