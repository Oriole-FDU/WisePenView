import { useLayoutEffect, useRef, useState, type Key } from 'react';
import type { SegmentedTabsProps } from './index.type';
import styles from './style.module.less';

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function SegmentedTabs<T extends Key = string>({
  ariaLabel,
  items,
  selectedKey,
  onSelectionChange,
  className,
  listClassName,
  tabClassName,
  block = false,
  size = 'md',
  variant = 'underline',
}: SegmentedTabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  useLayoutEffect(() => {
    const listEl = listRef.current;
    const updateIndicator = () => {
      const selectedEl = tabRefs.current.get(String(selectedKey));
      if (!selectedEl || !listEl) return;
      const listRect = listEl.getBoundingClientRect();
      const tabRect = selectedEl.getBoundingClientRect();
      setIndicatorStyle({
        left: tabRect.left - listRect.left - listEl.clientLeft,
        width: tabRect.width,
      });
    };

    updateIndicator();
    const observer = new ResizeObserver(updateIndicator);
    if (listEl) observer.observe(listEl);
    return () => observer.disconnect();
  }, [items.length, selectedKey]);

  const setTabRef = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) {
      tabRefs.current.set(key, el);
    } else {
      tabRefs.current.delete(key);
    }
  };

  return (
    <div
      className={cx(styles.root, block && styles.block, styles[size], styles[variant], className)}
    >
      <div
        className={cx(styles.list, listClassName)}
        role="tablist"
        aria-label={ariaLabel}
        ref={listRef}
      >
        <div
          className={styles.indicator}
          style={{
            transform: `translateX(${indicatorStyle.left}px)`,
            width: `${indicatorStyle.width}px`,
          }}
        />
        {items.map((item) => {
          const selected = item.key === selectedKey;
          return (
            <button
              key={String(item.key)}
              ref={setTabRef(String(item.key))}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={item.disabled}
              className={cx(
                styles.tab,
                selected && styles.tabSelected,
                item.disabled && styles.tabDisabled,
                tabClassName
              )}
              onClick={() => {
                if (!item.disabled) {
                  onSelectionChange(item.key);
                }
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SegmentedTabs;
export type { SegmentedTabItem, SegmentedTabsProps } from './index.type';
