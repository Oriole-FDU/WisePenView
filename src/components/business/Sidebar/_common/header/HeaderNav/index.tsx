import { ListBox, ListBoxItem, ListBoxSection, Separator, Tooltip } from '@heroui/react';
import { type ComponentPropsWithRef, useLayoutEffect, useRef } from 'react';

import { cn } from '@/utils/cn';
import { mergeRefs } from '@/utils/react/mergeRefs';

import type { HeaderNavItem, HeaderNavProps, HeaderNavSection } from './index.type';
import styles from './style.module.less';

const DEFAULT_SECTION_KEY = 'default';

function HeaderNav({
  ariaLabel,
  activeKey,
  collapsed = false,
  items,
  sections,
  showIndicator = false,
  labelsHidden = false,
}: HeaderNavProps) {
  const navSections = sections ?? [{ key: DEFAULT_SECTION_KEY, items: items ?? [] }];
  const shouldRenderSections = Boolean(sections);
  const navItems = navSections[0]?.items ?? [];

  // 滑动指示器直接同步 DOM，避免在布局副作用中触发额外渲染。
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
      if (!indicatorEl || !containerEl || !showIndicator) return;

      if (!activeKey) {
        indicatorEl.style.opacity = '0';
        return;
      }

      const activeEl = itemRefs.current.get(activeKey);
      if (!activeEl) {
        indicatorEl.style.opacity = '0';
        return;
      }

      const containerRect = containerEl.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      if (elRect.width < 2 || elRect.height < 2 || containerRect.width < 2) {
        indicatorEl.style.opacity = '0';
        return;
      }

      indicatorEl.style.transform = `translateY(${elRect.top - containerRect.top}px)`;
      indicatorEl.style.opacity = '1';
    };

    syncIndicator();
    const observer = new ResizeObserver(syncIndicator);
    if (containerEl) observer.observe(containerEl);
    const selectedEl = activeKey ? itemRefs.current.get(activeKey) : undefined;
    if (selectedEl) observer.observe(selectedEl);
    return () => observer.disconnect();
  }, [activeKey, showIndicator]);

  const renderItem = (item: HeaderNavItem) => {
    const isActive = item.key === activeKey;
    const Icon = item.icon;
    const icon = (
      <span className={styles.menuIcon}>
        <Icon size={18} />
      </span>
    );

    return (
      <ListBoxItem
        key={item.key}
        id={item.key}
        ref={setItemRef(item.key)}
        textValue={item.name}
        aria-label={item.name}
        aria-current={isActive ? 'page' : undefined}
        data-nav-active={isActive ? 'true' : undefined}
        isDisabled={item.isDisabled}
        className={cn(
          styles.menuItem,
          collapsed && styles.menuItemCollapsed,
          labelsHidden && styles.menuItemLabelsHidden,
          isActive && styles.menuItemActive
        )}
        onAction={item.onPress}
        render={
          collapsed
            ? (domProps) => {
                // 导航项只使用 onAction，不传 href；React Aria 在此始终渲染 div。
                const { ref: itemRef, ...itemProps } = domProps as ComponentPropsWithRef<'div'>;
                return (
                  <Tooltip isDisabled={item.isDisabled}>
                    <Tooltip.Trigger
                      {...itemProps}
                      render={({ ref: tooltipRef, ...tooltipProps }) => (
                        <div
                          {...tooltipProps}
                          tabIndex={itemProps.tabIndex}
                          ref={mergeRefs(itemRef, tooltipRef)}
                        />
                      )}
                    />
                    <Tooltip.Content placement="right">{item.name}</Tooltip.Content>
                  </Tooltip>
                );
              }
            : undefined
        }
      >
        {collapsed ? (
          <span className={styles.menuTooltipTrigger}>{icon}</span>
        ) : (
          <>
            {icon}
            <span className={styles.menuLabel} aria-hidden={labelsHidden || undefined}>
              <span className={styles.menuLabelText}>{item.name}</span>
            </span>
          </>
        )}
      </ListBoxItem>
    );
  };

  const renderSection = (section: HeaderNavSection) => (
    <ListBoxSection key={section.key} id={section.key} className={styles.menuSection}>
      {section.items.map(renderItem)}
    </ListBoxSection>
  );

  return (
    <div ref={containerRef} className={styles.navContainer}>
      {showIndicator ? (
        <div
          ref={indicatorRef}
          className={cn(styles.indicator, collapsed && styles.indicatorCollapsed)}
        />
      ) : null}
      <ListBox
        aria-label={ariaLabel}
        selectionMode="none"
        className={cn(styles.headerMenu, collapsed && styles.headerMenuCollapsed)}
      >
        {shouldRenderSections ? navSections.map(renderSection) : navItems.map(renderItem)}
      </ListBox>
      <Separator
        aria-hidden="true"
        className={cn(styles.divider, labelsHidden && styles.dividerHidden)}
      />
    </div>
  );
}

export default HeaderNav;
