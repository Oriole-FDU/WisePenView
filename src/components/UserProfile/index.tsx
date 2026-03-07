import React from 'react';
import { Avatar, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';

import { 
  RiArrowDownSLine, 
  RiBankCardLine,
  RiPieChartLine,
  RiShieldUserLine,
  RiFeedbackLine,
  RiTranslate2, 
  RiSunLine,
  RiLogoutBoxRLine
} from 'react-icons/ri';

import styles from './style.module.less';

interface UserProfileProps {
  collapsed: boolean;
}

const UserProfile: React.FC<UserProfileProps> = ({ collapsed }) => {
  const navigate = useNavigate();

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'subscription':
        navigate('/app/profile/subscription');
        break;
      case 'usage':
        navigate('/app/profile/usage');
        break;
      case 'account':
        navigate('/app/profile/account');
        break;
      case 'feedback':
        navigate('/app/profile/feedback');
        break;
      case 'language':
        console.log('打开语言设置');
        break;
      case 'theme':
        console.log('打开主题设置');
        break;
      case 'logout':
        useUserStore.getState().clearUser();
        navigate('/login', { replace: true });
        break;
      default:
        break;
    }
  };

  const items: MenuProps['items'] = [
    // --- 第一组：订阅与财务 ---
    {
      key: 'subscription',
      label: '订阅信息',
      icon: <RiBankCardLine size={16} />,
    },
    {
      key: 'usage',
      label: '余额与使用量',
      icon: <RiPieChartLine size={16} />,
    },
    { type: 'divider' },
    
    // --- 第二组：账号与反馈 ---
    {
      key: 'account',
      label: '账号',
      icon: <RiShieldUserLine size={16} />,
    },
    {
      key: 'feedback',
      label: '用户反馈',
      icon: <RiFeedbackLine size={16} />,
    },
    { type: 'divider' },

    // --- 第三组：设置 (带右侧文字) ---
    {
      key: 'language',
      label: '语言',
      icon: <RiTranslate2 size={16} />,
      extra: <span style={{ fontSize: 12, color: '#999' }}>简体中文</span>, 
    },
    {
      key: 'theme',
      label: '外观',
      icon: <RiSunLine size={16} />,
      extra: <span style={{ fontSize: 12, color: '#999' }}>浅色</span>,
    },
    { type: 'divider' },

    // --- 第四组：退出 ---
    {
      key: 'logout',
      label: '退出登录',
      icon: <RiLogoutBoxRLine size={16} />,
    },
  ];

  // 下拉菜单配置
  const dropdownProps = {
    menu: {
      items,
      onClick: handleMenuClick,
      style: { minWidth: 240 },
    },
    trigger: ['click'] as ('click' | 'hover' | 'contextMenu')[],
    placement: 'topLeft' as const, 
  };

  return (
    <Dropdown {...dropdownProps}>
      <div className={clsx(styles.profile, !collapsed && styles.expanded)}>
        {/* 头像 */}
        <Avatar size="small" className={styles.avatar}>
          US
        </Avatar>
        
        {/* 用户信息区 */}
        {!collapsed && (
          <>
            <div className={styles.info}>
              <span className={styles.username}>user_1008</span>
              <span className={styles.tag}>FREE</span>
            </div>
            <RiArrowDownSLine className={styles.icon} />
          </>
        )}
      </div>
    </Dropdown>
  );
};

export default UserProfile;