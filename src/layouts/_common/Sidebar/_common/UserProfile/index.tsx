import logoImg from '@/assets/images/logo-icon.png';
import AppAvatar from '@/components/Avatar';
import AppDisplayDialog from '@/components/Overlay/AppDisplayDialog';
import { useUserService } from '@/domains';
import type { User } from '@/domains/User';
import { IDENTITY } from '@/domains/User';
import { Dropdown } from '@heroui/react';
import { useMount } from 'ahooks';
import clsx from 'clsx';
import {
  ChartPie,
  Home,
  Info,
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
import UserFeedbackModal from '../UserFeedbackModal';
import styles from './style.module.less';

interface UserProfileProps {
  collapsed: boolean;
  menuMode?: 'app' | 'admin';
}

function UserProfile({ collapsed, menuMode = 'app' }: UserProfileProps) {
  const { t } = useTranslation(['shell', 'common']);
  const navigate = useNavigate();
  const userService = useUserService();
  const [user, setUser] = useState<User | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const authService = useAuthService();

  useMount(() => {
    void userService.getUserInfo().then(setUser);
  });

  const displayName = user?.nickname || user?.username || '-';
  const identityKey =
    user?.identityType !== undefined ? IDENTITY.getKey(user.identityType) : undefined;
  const identityLabel = identityKey
    ? t(`role.${identityKey}`)
    : t('placeholder.dash', { ns: 'common' });
  const isAdmin = user?.identityType === IDENTITY.ADMIN;

  const handleMenuAction = (key: React.Key) => {
    switch (key) {
      case 'enter-admin':
        navigate('/admin/users');
        break;
      case 'back-app':
        navigate('/app');
        break;
      case 'subscription':
        navigate('/app/profile/subscription');
        break;
      case 'usage':
        navigate('/app/profile/usage');
        break;
      case 'account':
        navigate('/app/profile/account');
        break;
      case 'appearance':
        navigate('/app/profile/appearance');
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
    <Dropdown.Popover placement="top left" className={styles.profilePopover}>
      <Dropdown.Menu
        aria-label={t('userMenu.aria')}
        className={styles.profileMenu}
        onAction={handleMenuAction}
      >
        {menuMode === 'admin' ? (
          <>
            <Dropdown.Item
              id="back-app"
              textValue={t('userMenu.backToApp')}
              className={styles.profileMenuItem}
            >
              <Home size={16} />
              <span>{t('userMenu.backToApp')}</span>
            </Dropdown.Item>
            <Dropdown.Item
              id="about"
              textValue={t('userMenu.about')}
              className={styles.profileMenuItem}
            >
              <Info size={16} />
              <span>{t('userMenu.about')}</span>
            </Dropdown.Item>
            <Dropdown.Item
              id="logout"
              textValue={t('userMenu.logout')}
              variant="danger"
              className={styles.profileMenuItem}
            >
              <LogOut size={16} />
              <span>{t('userMenu.logout')}</span>
            </Dropdown.Item>
          </>
        ) : (
          <>
            <Dropdown.Item
              id="usage"
              textValue={t('userMenu.usage')}
              className={styles.profileMenuItem}
            >
              <ChartPie size={16} />
              <span>{t('userMenu.usage')}</span>
            </Dropdown.Item>
            <Dropdown.Item
              id="account"
              textValue={t('userMenu.account')}
              className={styles.profileMenuItem}
            >
              <ShieldUser size={16} />
              <span>{t('userMenu.account')}</span>
            </Dropdown.Item>
            <Dropdown.Item
              id="appearance"
              textValue={t('userMenu.appearance')}
              className={styles.profileMenuItem}
            >
              <Palette size={16} />
              <span>{t('userMenu.appearance')}</span>
            </Dropdown.Item>
            <Dropdown.Item
              id="feedback"
              textValue={t('userMenu.feedback')}
              className={styles.profileMenuItem}
            >
              <MessageSquare size={16} />
              <span>{t('userMenu.feedback')}</span>
            </Dropdown.Item>
            {isAdmin && (
              <Dropdown.Item
                id="enter-admin"
                textValue={t('userMenu.enterAdmin')}
                className={styles.profileMenuItem}
              >
                <Shield size={16} />
                <span>{t('userMenu.enterAdmin')}</span>
              </Dropdown.Item>
            )}
            <Dropdown.Item
              id="about"
              textValue={t('userMenu.about')}
              className={styles.profileMenuItem}
            >
              <Info size={16} />
              <span>{t('userMenu.about')}</span>
            </Dropdown.Item>
            <Dropdown.Item
              id="logout"
              textValue={t('userMenu.logout')}
              variant="danger"
              className={styles.profileMenuItem}
            >
              <LogOut size={16} />
              <span>{t('userMenu.logout')}</span>
            </Dropdown.Item>
          </>
        )}
      </Dropdown.Menu>
    </Dropdown.Popover>
  );

  return (
    <>
      <div className={clsx(styles.profile, !collapsed && styles.expanded)}>
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
                <Settings className={styles.icon} />
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
          <img className={styles.aboutLogo} src={logoImg} alt="" />
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
