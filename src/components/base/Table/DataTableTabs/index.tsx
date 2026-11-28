import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppPressable } from '@/components/base/Button';

import type { DataTableTabsProps } from './index.type';
import styles from './style.module.scss';

function DataTableTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  ariaLabel,
}: DataTableTabsProps<T>) {
  const { t } = useTranslation('table');
  const resolvedAriaLabel = ariaLabel ?? t('aria.filter');
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  useLayoutEffect(() => {
    const listEl = listRef.current;
    const updateIndicator = () => {
      const activeEl = tabRefs.current.get(activeTab);
      if (!activeEl || !listEl) return;
      const listRect = listEl.getBoundingClientRect();
      const tabRect = activeEl.getBoundingClientRect();
      setIndicatorStyle({
        left: tabRect.left - listRect.left - listEl.clientLeft,
        width: tabRect.width,
      });
    };

    updateIndicator();
    const observer = new ResizeObserver(updateIndicator);
    if (listEl) observer.observe(listEl);
    return () => observer.disconnect();
  }, [activeTab, tabs.length]);

  const setTabRef = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) {
      tabRefs.current.set(key, el);
    } else {
      tabRefs.current.delete(key);
    }
  };

  return (
    <div className={styles.tabList} role="tablist" aria-label={resolvedAriaLabel} ref={listRef}>
      <div
        className={styles.indicator}
        style={{
          transform: `translateX(${indicatorStyle.left}px)`,
          width: `${indicatorStyle.width}px`,
        }}
      />
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <AppPressable
            key={tab.key}
            ref={setTabRef(tab.key)}
            role="tab"
            aria-selected={isActive}
            className={isActive ? styles.tabActive : styles.tabItem}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </AppPressable>
        );
      })}
    </div>
  );
}

export default DataTableTabs;
