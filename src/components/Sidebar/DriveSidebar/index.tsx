import SidebarDrive from '@/components/Drive/SidebarDrive';
import clsx from 'clsx';
import { RiArrowLeftSLine, RiIndentDecrease, RiIndentIncrease } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import UserProfile from '../_common/UserProfile';
import type { DriveSidebarProps } from './index.type';
import styles from './style.module.less';

function DriveSidebar({ collapsed, onToggle }: DriveSidebarProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/app/drive');
  };

  return (
    <div className={clsx(styles.sider, collapsed && styles.collapsed)}>
      <div className={styles.header}>
        <button type="button" onClick={onToggle} className={styles.iconBtn} aria-label="切换侧边栏">
          {collapsed ? (
            <RiIndentIncrease size={18} style={{ transform: 'rotate(180deg)' }} />
          ) : (
            <RiIndentDecrease size={18} style={{ transform: 'rotate(180deg)' }} />
          )}
        </button>

        {!collapsed && (
          <button type="button" onClick={handleBack} className={styles.backBtn}>
            <RiArrowLeftSLine size={18} />
            <span className={styles.backText}>返回主菜单</span>
          </button>
        )}
      </div>

      <div className={styles.body}>{!collapsed && <SidebarDrive />}</div>

      <UserProfile collapsed={collapsed} />
    </div>
  );
}

export default DriveSidebar;
