import { useCurrentChatSessionStore } from '@/components/ChatPanel/_store/useCurrentChatSessionStore';
import { clearNewChatSessionStore } from '@/components/ChatPanel/_store/useNewChatSessionStore';
import {
  APP_HEADER_NAV_ITEMS,
  APP_HEADER_NAV_KEY,
  resolveAppHeaderNavKey,
  type AppHeaderNavKey,
} from '@/layouts/_common/Sidebar/appSidebarNavigation';
import { ListBox, ListBoxItem } from '@heroui/react';
import clsx from 'clsx';
import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AppHeaderNavProps } from './index.type';
import styles from './style.module.less';

function AppHeaderNav({ collapsed }: AppHeaderNavProps) {
  const { t } = useTranslation('shell');
  const navigate = useNavigate();
  const location = useLocation();
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const clearCurrentSession = useCurrentChatSessionStore((state) => state.clearCurrentSession);

  const activeNavKey = resolveAppHeaderNavKey(location.pathname);
  const selectedKeys =
    activeNavKey && !(activeNavKey === APP_HEADER_NAV_KEY.CHAT && currentSessionId)
      ? [activeNavKey]
      : [];

  const handleNavItemPress = (navKey: AppHeaderNavKey) => {
    if (navKey === APP_HEADER_NAV_KEY.CHAT) {
      clearCurrentSession();
      clearNewChatSessionStore();
    }
    navigate(navKey);
  };

  // Sliding indicator — direct DOM manipulation to avoid setState in effect
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  const setItemRef = (key: string) => (el: HTMLElement | null) => {
    if (el) {
      itemRefs.current.set(key, el);
    } else {
      itemRefs.current.delete(key);
    }
  };

  useLayoutEffect(() => {
    const indicatorEl = indicatorRef.current;
    const containerEl = containerRef.current;
    const syncIndicator = () => {
      if (!indicatorEl || !containerEl) return;

      if (!activeNavKey) {
        indicatorEl.style.opacity = '0';
        return;
      }

      const activeEl = itemRefs.current.get(activeNavKey);
      if (!activeEl) {
        indicatorEl.style.opacity = '0';
        return;
      }

      const containerRect = containerEl.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      indicatorEl.style.transform = `translateY(${elRect.top - containerRect.top}px)`;
      indicatorEl.style.opacity = '1';
    };

    syncIndicator();
    const observer = new ResizeObserver(syncIndicator);
    if (containerEl) observer.observe(containerEl);
    return () => observer.disconnect();
  }, [activeNavKey, collapsed]);

  return (
    <div
      ref={containerRef}
      className={clsx(styles.navContainer, collapsed && styles.navContainerCollapsed)}
    >
      <div ref={indicatorRef} className={styles.indicator} />
      <ListBox
        aria-label={t('navigation.appAria')}
        selectionMode="single"
        selectedKeys={selectedKeys}
        className={clsx(styles.headerMenu, collapsed && styles.headerMenuCollapsed)}
      >
        {APP_HEADER_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const label = t(item.labelKey);
          return (
            <ListBoxItem
              key={item.key}
              ref={setItemRef(item.key)}
              textValue={label}
              className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
              onPress={() => handleNavItemPress(item.key)}
            >
              <span className={styles.menuIcon}>
                <Icon size={16} />
              </span>
              {!collapsed && <span className={styles.menuLabel}>{label}</span>}
            </ListBoxItem>
          );
        })}
      </ListBox>
    </div>
  );
}

export default AppHeaderNav;
