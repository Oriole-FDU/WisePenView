import AppAvatar from '@/components/Avatar';
import { AppButton } from '@/components/Button';
import AppDisplayDialog from '@/components/Overlay/AppDisplayDialog';
import { useUserService } from '@/domains';
import type { User } from '@/domains/User';
import { IDENTITY } from '@/domains/User';
import { useAppAuth } from '@/layouts/App/AppAuthContext';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import { cn } from '@/utils/cn';
import { Dropdown, Label } from '@heroui/react';
import { useMount } from 'ahooks';
import {
  ChartPie,
  Home,
  Info,
  KeyRound,
  LogIn,
  LogOut,
  MessageSquare,
  Palette,
  Settings,
  Shield,
  ShieldUser,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuthService } from '@/domains';
import { COLOR_SCHEME_ICON_SRC, useColorScheme } from '@/theme';
import UserFeedbackModal from '../UserFeedbackModal';
import styles from './style.module.less';

interface UserProfileProps {
  collapsed: boolean;
  menuMode?: 'app' | 'admin';
}

function UserProfile({ collapsed, menuMode = 'app' }: UserProfileProps) {
  const { t } = useTranslation(['shell', 'common']);
  const navigate = useNavigate();
  const appAuth = useAppAuth();
  const userService = useUserService();
  const { colorScheme } = useColorScheme();
  const [user, setUser] = useState<User | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const authService = useAuthService();

  useMount(() => {
    if (!appAuth.isAuthenticated) return;
    void userService.getUserInfo().then(setUser);
  });

  const displayName = user?.nickname || user?.username || '-';
  const identityKey =
    user?.identityType !== undefined ? IDENTITY.getKey(user.identityType) : undefined;
  const identityLabel = identityKey
    ? t(`role.${identityKey}`)
    : t('placeholder.dash', { ns: 'common' });
  const isAdmin = user?.identityType === IDENTITY.ADMIN;

  if (!appAuth.isAuthenticated) {
    const handleLogin = () => navigate(appAuth.loginPath);

    return (
      <div className={cn(styles.profile, !collapsed && styles.expanded)}>
        {collapsed ? (
          <button
            type="button"
            className={styles.avatarTrigger}
            aria-label={t('anonymous.login')}
            onClick={handleLogin}
          >
            <LogIn size={18} aria-hidden="true" />
          </button>
        ) : (
          <>
            <AppAvatar size="sm" className={styles.avatar}>
              <AppAvatar.Fallback>{t('anonymous.avatar')}</AppAvatar.Fallback>
            </AppAvatar>
            <div className={styles.info}>
              <span className={styles.username}>{t('anonymous.title')}</span>
              <span className={styles.tag}>{t('anonymous.subtitle')}</span>
            </div>
            <AppButton
              size="sm"
              variant="primary"
              className={styles.loginButton}
              onPress={handleLogin}
            >
              {t('anonymous.login')}
            </AppButton>
          </>
        )}
      </div>
    );
  }

  const handleMenuAction = (key: React.Key) => {
    switch (key) {
      case 'enter-admin':
        navigate(APP_ROUTE_PATH.ADMIN_USERS);
        break;
      case 'back-app':
        navigate(APP_ROUTE_PATH.CHAT);
        break;
      case 'usage':
        navigate(APP_ROUTE_PATH.PROFILE_USAGE);
        break;
      case 'account':
        navigate(APP_ROUTE_PATH.PROFILE_ACCOUNT);
        break;
      case 'appearance':
        navigate(APP_ROUTE_PATH.PROFILE_APPEARANCE);
        break;
      case 'ai':
        navigate(APP_ROUTE_PATH.PROFILE_AI);
        break;
      case 'feedback':
        setFeedbackModalOpen(true);
        break;
      case 'about':
        setAboutDialogOpen(true);
        break;
      // case 'language':
      //   break;
      // case 'theme':
      //   break;
      case 'logout':
        void authService.logout();
        break;
      default:
        break;
    }
  };

  const userAvatar = (
    <AppAvatar size="sm" className={styles.avatar}>
      {user?.avatar ? <AppAvatar.Image src={user.avatar} alt={displayName} /> : null}
      <AppAvatar.Fallback>{displayName.charAt(0).toUpperCase()}</AppAvatar.Fallback>
    </AppAvatar>
  );

  const userMenu = (
    <Dropdown.Popover placement="top left" className={styles.profileMenuPopover}>
      <Dropdown.Menu aria-label={t('userMenu.aria')} onAction={handleMenuAction}>
        {menuMode === 'admin' ? (
          <>
            <Dropdown.Item id="back-app" textValue={t('userMenu.backToApp')}>
              <Home size={16} />
              <Label>{t('userMenu.backToApp')}</Label>
            </Dropdown.Item>
            <Dropdown.Item id="about" textValue={t('userMenu.about')}>
              <Info size={16} />
              <Label>{t('userMenu.about')}</Label>
            </Dropdown.Item>
            <Dropdown.Item id="logout" textValue={t('userMenu.logout')} variant="danger">
              <LogOut size={16} />
              <Label>{t('userMenu.logout')}</Label>
            </Dropdown.Item>
          </>
        ) : (
          <>
            <Dropdown.Item id="usage" textValue={t('userMenu.usage')}>
              <ChartPie size={16} />
              <Label>{t('userMenu.usage')}</Label>
            </Dropdown.Item>
            <Dropdown.Item id="account" textValue={t('userMenu.account')}>
              <ShieldUser size={16} />
              <Label>{t('userMenu.account')}</Label>
            </Dropdown.Item>
            <Dropdown.Item id="appearance" textValue={t('userMenu.appearance')}>
              <Palette size={16} />
              <Label>{t('userMenu.appearance')}</Label>
            </Dropdown.Item>
            <Dropdown.Item id="ai" textValue={t('userMenu.ai')}>
              <KeyRound size={16} />
              <Label>{t('userMenu.ai')}</Label>
            </Dropdown.Item>
            <Dropdown.Item id="feedback" textValue={t('userMenu.feedback')}>
              <MessageSquare size={16} />
              <Label>{t('userMenu.feedback')}</Label>
            </Dropdown.Item>
            {isAdmin && (
              <Dropdown.Item id="enter-admin" textValue={t('userMenu.enterAdmin')}>
                <Shield size={16} />
                <Label>{t('userMenu.enterAdmin')}</Label>
              </Dropdown.Item>
            )}
            <Dropdown.Item id="about" textValue={t('userMenu.about')}>
              <Info size={16} />
              <Label>{t('userMenu.about')}</Label>
            </Dropdown.Item>
            <Dropdown.Item id="logout" textValue={t('userMenu.logout')} variant="danger">
              <LogOut size={16} />
              <Label>{t('userMenu.logout')}</Label>
            </Dropdown.Item>
          </>
        )}
      </Dropdown.Menu>
    </Dropdown.Popover>
  );

  return (
    <>
      <div className={cn(styles.profile, !collapsed && styles.expanded)}>
        {collapsed ? (
          <Dropdown>
            <Dropdown.Trigger aria-label={t('userMenu.openAria')} className={styles.avatarTrigger}>
              {userAvatar}
            </Dropdown.Trigger>
            {userMenu}
          </Dropdown>
        ) : (
          <>
            {userAvatar}
            <div className={styles.info}>
              <span className={styles.username}>{displayName}</span>
              <span className={styles.tag}>{identityLabel}</span>
            </div>
            <Dropdown>
              <Dropdown.Trigger
                aria-label={t('userMenu.openSettingsAria')}
                className={styles.menuTrigger}
              >
                <Settings size={16} aria-hidden="true" />
              </Dropdown.Trigger>
              {userMenu}
            </Dropdown>
          </>
        )}
      </div>

      <AppDisplayDialog
        isOpen={aboutDialogOpen}
        onOpenChange={setAboutDialogOpen}
        title={t('userMenu.aboutTitle')}
        closeText={t('actions.close', { ns: 'common' })}
      >
        <div className={styles.aboutContent}>
          <img className={styles.aboutLogo} src={COLOR_SCHEME_ICON_SRC[colorScheme]} alt="" />
          <div className={styles.aboutProductName}>WisePen</div>
          <div className={styles.aboutVersion}>
            {t('userMenu.version', { version: __APP_VERSION__ })}
          </div>
        </div>
      </AppDisplayDialog>

      <UserFeedbackModal isOpen={feedbackModalOpen} onOpenChange={setFeedbackModalOpen} />
    </>
  );
}

export default UserProfile;
