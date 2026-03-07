import React from 'react';
import { Menu, Avatar, Dropdown } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  RiIndentDecrease,
  RiIndentIncrease,
  RiAddCircleFill,
  RiFileTextLine,
  RiGroupFill,
  RiArrowDownSLine,
} from 'react-icons/ri';

import styles from './style.module.less';
import logoImg from '@/assets/images/logo-icon.png';

import UserProfile from '@/components/UserProfile'; // 引入新组件

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 菜单配置
  const menuItems = [
    {
      key: 'new-chat',
      icon: <RiAddCircleFill size={18} />, 
      label: '新聊天',
      onClick: () => console.log('Create New Chat'),
    },
    {
      key: '/app/drive',
      icon: <RiFileTextLine size={18} />,
      label: '文档与云盘',
    },
    {
      key: '/app/my-group',
      icon: <RiGroupFill size={18} />,
      label: '我的小组',
    },
    {
      type: 'group',
      label: '聊天记录',
      key: 'grp1',
      children: [
        { key: 'history1', label: '暂无会话', disabled: true },
      ],
    },
    {
      type: 'group',
      label: '文档',
      key: 'grp2',
      children: [
        { key: 'doc1', label: '暂无文档', disabled: true },
      ],
    },
  ];

  return (
    <div className={clsx(styles.sider, collapsed && styles.collapsed)}>
      
      {/* Header */}
      <div className={clsx(styles.header, collapsed && styles.collapsedHeader)}>
        <div onClick={onToggle} className={styles.triggerBtn}>
           {collapsed ? <RiIndentIncrease /> : <RiIndentDecrease />}
        </div>

        {!collapsed && (
          <>
            <div className={styles.logoIcon}>
              <img src={logoImg} alt="WisePen" />
            </div>
            <span className={styles.logoText}>WisePen</span>
          </>
        )}
      </div>

      {/* Menu */}
      <div className={styles.menuContainer}>
        <Menu
          mode="inline"
          theme="light" 
          selectedKeys={[location.pathname]}
          inlineCollapsed={collapsed}
          items={menuItems as any}
          onClick={({ key }) => {
             if(key.toString().startsWith('/')) navigate(key.toString());
          }}
        />
      </div>

      {/* Footer */}
      <UserProfile collapsed={collapsed} />
    </div>
  );
};

export default Sidebar;