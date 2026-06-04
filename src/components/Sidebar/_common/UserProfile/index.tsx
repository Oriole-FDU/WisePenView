import { useUserService } from '@/domains';
import type { User } from '@/domains/User';
import { IDENTITY } from '@/domains/User';
import { Avatar, Button, Dropdown, Modal } from '@heroui/react';
import { useMount } from 'ahooks';
import clsx from 'clsx';
import {
  ChartPie,
  Home,
  LogOut,
  MessageSquare,
  Palette,
  Settings,
  Shield,
  ShieldUser,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthService } from '@/domains';
import styles from './style.module.less';

/** 问卷星问题反馈页（内嵌 iframe） */
const FEEDBACK_SURVEY_URL = 'https://v.wjx.cn/vm/PrUZetY.aspx';

interface UserProfileProps {
  collapsed: boolean;
  menuMode?: 'app' | 'admin';
}

function UserProfile({ collapsed, menuMode = 'app' }: UserProfileProps) {
  const navigate = useNavigate();
  const userService = useUserService();
  const [user, setUser] = useState<User | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const authService = useAuthService();

  useMount(() => {
    void userService.getUserInfo().then(setUser);
  });

  const displayName = user?.nickname || user?.username || '-';
  const identityLabel =
    user?.identityType !== undefined ? IDENTITY.getLabel(user.identityType) : '-';
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
      // case 'language':
      //   break;
      // case 'theme':
      //   break;
      case 'logout':
        authService.logout();
        navigate('/login', { replace: true });
        break;
      default:
        break;
    }
  };

  const handleCloseFeedback = () => {
    setFeedbackModalOpen(false);
  };

  return (
    <>
      <Dropdown>
        <div className={clsx(styles.profile, !collapsed && styles.expanded)}>
          {collapsed ? (
            <Dropdown.Trigger aria-label="打开用户菜单" className={styles.avatarTrigger}>
              <Avatar size="sm" className={styles.avatar}>
                {user?.avatar ? <Avatar.Image src={user.avatar} alt={displayName} /> : null}
                <Avatar.Fallback>{displayName.charAt(0).toUpperCase()}</Avatar.Fallback>
              </Avatar>
            </Dropdown.Trigger>
          ) : (
            <>
              <Avatar size="sm" className={styles.avatar}>
                {user?.avatar ? <Avatar.Image src={user.avatar} alt={displayName} /> : null}
                <Avatar.Fallback>{displayName.charAt(0).toUpperCase()}</Avatar.Fallback>
              </Avatar>
              <div className={styles.info}>
                <span className={styles.username}>{displayName}</span>
                <span className={styles.tag}>{identityLabel}</span>
              </div>
              <Dropdown.Trigger aria-label="打开用户设置菜单" className={styles.menuTrigger}>
                <Settings className={styles.icon} />
              </Dropdown.Trigger>
            </>
          )}
        </div>
        <Dropdown.Popover placement="top left">
          <Dropdown.Menu
            aria-label="用户菜单"
            className={styles.profileMenu}
            onAction={handleMenuAction}
          >
            {menuMode === 'admin' ? (
              <>
                <Dropdown.Item
                  id="back-app"
                  textValue="回到用户端"
                  className={styles.profileMenuItem}
                >
                  <Home size={16} />
                  <span>回到用户端</span>
                </Dropdown.Item>
                <Dropdown.Item id="logout" textValue="退出登录" className={styles.profileMenuItem}>
                  <LogOut size={16} />
                  <span>退出登录</span>
                </Dropdown.Item>
              </>
            ) : (
              <>
                <Dropdown.Item
                  id="usage"
                  textValue="余额与使用量"
                  className={styles.profileMenuItem}
                >
                  <ChartPie size={16} />
                  <span>余额与使用量</span>
                </Dropdown.Item>
                <Dropdown.Item id="account" textValue="账号" className={styles.profileMenuItem}>
                  <ShieldUser size={16} />
                  <span>账号</span>
                </Dropdown.Item>
                <Dropdown.Item id="appearance" textValue="外观" className={styles.profileMenuItem}>
                  <Palette size={16} />
                  <span>外观</span>
                </Dropdown.Item>
                <Dropdown.Item
                  id="feedback"
                  textValue="用户反馈"
                  className={styles.profileMenuItem}
                >
                  <MessageSquare size={16} />
                  <span>用户反馈</span>
                </Dropdown.Item>
                {isAdmin && (
                  <Dropdown.Item
                    id="enter-admin"
                    textValue="进入管理"
                    className={styles.profileMenuItem}
                  >
                    <Shield size={16} />
                    <span>进入管理</span>
                  </Dropdown.Item>
                )}
                <Dropdown.Item id="logout" textValue="退出登录" className={styles.profileMenuItem}>
                  <LogOut size={16} />
                  <span>退出登录</span>
                </Dropdown.Item>
              </>
            )}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <Modal isOpen={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
        <Modal.Backdrop isDismissable>
          <Modal.Container size="lg" placement="center" className={styles.feedbackModal}>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>问题反馈</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className={styles.feedbackIframeWrap}>
                  <iframe
                    className={styles.feedbackIframe}
                    title="问卷星问题反馈"
                    src={FEEDBACK_SURVEY_URL}
                    allowFullScreen
                  />
                </div>
                <p className={styles.feedbackFallback}>
                  若页面无法显示，请
                  <a
                    className={styles.feedbackFallbackLink}
                    href={FEEDBACK_SURVEY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    在新窗口打开问卷
                  </a>
                  。
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="primary" onPress={handleCloseFeedback}>
                  关闭
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

export default UserProfile;
