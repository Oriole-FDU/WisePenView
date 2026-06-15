import type { Key } from 'react';
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
}: SegmentedTabsProps<T>) {
  return (
    <div className={cx(styles.root, block && styles.block, styles[size], className)}>
      <div className={cx(styles.list, listClassName)} role="tablist" aria-label={ariaLabel}>
        {items.map((item) => {
          const selected = item.key === selectedKey;
          return (
            <button
              key={String(item.key)}
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
