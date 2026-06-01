import logoImg from '@/assets/images/logo-icon.png';
import clsx from 'clsx';
import { RiIndentDecrease, RiIndentIncrease } from 'react-icons/ri';
import type { SidebarHeaderProps } from './index.type';
import styles from './style.module.less';

function SidebarHeader({ collapsed, onToggle, title = 'WisePen', nav }: SidebarHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={clsx(styles.headerTop, collapsed && styles.collapsedHeaderTop)}>
        <button
          type="button"
          onClick={onToggle}
          className={styles.triggerBtn}
          aria-label="切换侧边栏"
        >
          {collapsed ? (
            <RiIndentIncrease size={18} style={{ transform: 'rotate(180deg)' }} />
          ) : (
            <RiIndentDecrease size={18} style={{ transform: 'rotate(180deg)' }} />
          )}
        </button>

        {!collapsed && (
          <>
            <div className={styles.logoIcon}>
              <img src={logoImg} alt="WisePen" />
            </div>
            <span className={styles.logoText}>{title}</span>
          </>
        )}
      </div>

      <div className={clsx(styles.headerNav, collapsed && styles.headerNavCollapsed)}>{nav}</div>
    </div>
  );
}

export default SidebarHeader;
