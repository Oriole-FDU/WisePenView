import React, { useMemo } from 'react';
import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  RiIndentDecrease,
  RiIndentIncrease,
  RiAddCircleFill,
  RiFileTextLine,
  RiGroupFill,
  RiPenNibFill,
} from 'react-icons/ri';

import FileTypeIcon from '@/components/Common/FileTypeIcon';
import styles from './style.module.less';
import logoImg from '@/assets/images/logo-icon.png';

import UserProfile from '@/components/UserProfile';
import { useRecentFilesStore } from '@/store';
import { useClickFile } from '@/hooks/drive';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const recentItems = useRecentFilesStore((s) => s.items);
  const clickFile = useClickFile();

  const menuItems = useMemo(() => {
    const baseItems: Parameters<typeof Menu>[0]['items'] = [
      {
        key: 'new-chat',
        icon: <RiAddCircleFill size={18} />,
        label: '新聊天',
        onClick: () => console.log('Create New Chat'),
      },
      {
        key: '/app/note',
        icon: <RiPenNibFill size={18} />,
        label: '新建笔记',
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
    ];

    if (!collapsed) {
      baseItems.push({
        type: 'group',
        label: '聊天记录',
        key: 'grp1',
        children: [{ key: 'history1', label: '暂无会话', disabled: true }],
      });

      const recentChildren =
        recentItems.length > 0
          ? recentItems.map((item) => ({
              key: `recent-${item.resourceId}`,
              icon: <FileTypeIcon resourceType={item.resourceType} size={16} />,
              label: item.resourceName || '未命名',
            }))
          : [{ key: 'recent-empty', label: '暂无最近文件', disabled: true }];

      baseItems.push({
        type: 'group',
        label: '最近使用',
        key: 'recent',
        children: recentChildren,
      });
    }

    return baseItems;
  }, [collapsed, recentItems]);

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
            const k = key.toString();
            if (k.startsWith('/')) {
              navigate(k);
            } else if (k.startsWith('recent-') && k !== 'recent-empty') {
              const resourceId = k.replace('recent-', '');
              const item = recentItems.find((i) => i.resourceId === resourceId);
              if (item) {
                clickFile({
                  resourceId: item.resourceId,
                  resourceName: item.resourceName,
                  resourceType: item.resourceType,
                });
              }
            }
          }}
        />
      </div>

      {/* Footer */}
      <UserProfile collapsed={collapsed} />
    </div>
  );
};

export default Sidebar;
