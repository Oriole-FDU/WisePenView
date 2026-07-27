import AppIconButton from '@/components/Button/AppIconButton';
import { ArrowLeft, ArrowRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './AppNavigationControls.module.less';

interface AppNavigationControlsProps {
  sidebarCollapsed: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onToggleSidebar: () => void;
}

function AppNavigationControls({
  sidebarCollapsed,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onToggleSidebar,
}: AppNavigationControlsProps) {
  const { t } = useTranslation('shell');
  const sidebarLabel = sidebarCollapsed
    ? t('navigation.expandSidebar')
    : t('navigation.collapseSidebar');

  return (
    <div className={styles.root}>
      <AppIconButton
        icon={
          sidebarCollapsed ? (
            <PanelLeftOpen size={18} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={18} aria-hidden="true" />
          )
        }
        label={sidebarLabel}
        onPress={onToggleSidebar}
      />
      <AppIconButton
        icon={<ArrowLeft size={18} aria-hidden="true" />}
        label={t('navigation.back')}
        isDisabled={!canGoBack}
        onPress={onGoBack}
      />
      <AppIconButton
        icon={<ArrowRight size={18} aria-hidden="true" />}
        label={t('navigation.forward')}
        isDisabled={!canGoForward}
        onPress={onGoForward}
      />
    </div>
  );
}

export default AppNavigationControls;
