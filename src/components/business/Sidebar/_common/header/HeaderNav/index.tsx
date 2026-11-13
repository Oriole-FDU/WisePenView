import { Separator } from '@heroui/react';
import { clsx } from 'clsx';
import { type ComponentPropsWithRef, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { AppPressable } from '@/components/base/Button';
import { GuideAnchor } from '@/components/base/Guide';
import { Tooltip } from '@/components/base/Tooltip';
import { mergeRefs } from '@/utils/react/mergeRefs';

import type { HeaderNavItem, HeaderNavProps, HeaderNavSection } from './index.type';
import styles from './style.module.scss';

const DEFAULT_SECTION_KEY = 'default';

function HeaderNav({
  ariaLabel,
  activeKey,
  collapsed = false,
  guideToolId,
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
    const content = collapsed ? (
      <span className={styles.menuTooltipTrigger}>{icon}</span>
    ) : (
      <>
        {icon}
        <span className={styles.menuLabel} aria-hidden={labelsHidden || undefined}>
          <span className={styles.menuLabelText}>{item.name}</span>
        </span>
      </>
    );
    const className = clsx(
      styles.menuItem,
      collapsed && styles.menuItemCollapsed,
      labelsHidden && styles.menuItemLabelsHidden,
      isActive && styles.menuItemActive
    );
    const itemStateProps = {
      'aria-label': item.name,
      'aria-current': isActive ? ('page' as const) : undefined,
      'data-nav-active': isActive ? 'true' : undefined,
      'data-guide-tool-id': item.toolId,
    };

    const renderLink = (extraProps: ComponentPropsWithRef<'a'> = {}) => {
      const { ref, ...props } = extraProps;
      return (
        <Link
          {...props}
          {...itemStateProps}
          ref={mergeRefs(setItemRef(item.key), ref)}
          to={item.href ?? '#'}
          className={className}
          onClick={item.onPress}
        >
          {content}
        </Link>
      );
    };

    const renderButton = (extraProps: ComponentPropsWithRef<'button'> = {}) => {
      const { ref, ...props } = extraProps;
      return (
        <AppPressable
          {...props}
          {...itemStateProps}
          ref={mergeRefs(setItemRef(item.key), ref)}
          className={className}
          disabled={item.isDisabled}
          onClick={item.onPress}
        >
          {content}
        </AppPressable>
      );
    };

    let control;
    if (!collapsed) {
      control = item.href ? renderLink() : renderButton();
    } else if (item.href) {
      control = (
        <Tooltip>
          <Tooltip.Trigger<'a'>
            render={({ ref, ...props }) =>
              renderLink({ ...props, ref } as ComponentPropsWithRef<'a'>)
            }
          >
            {content}
          </Tooltip.Trigger>
          <Tooltip.Content placement="right">{item.name}</Tooltip.Content>
        </Tooltip>
      );
    } else {
      control = (
        <Tooltip isDisabled={item.isDisabled}>
          <Tooltip.Trigger<'button'>
            render={({ ref, ...props }) =>
              renderButton({ ...props, ref } as ComponentPropsWithRef<'button'>)
            }
          >
            {content}
          </Tooltip.Trigger>
          <Tooltip.Content placement="right">{item.name}</Tooltip.Content>
        </Tooltip>
      );
    }

    return (
      <li key={item.key} className={styles.menuItemSlot}>
        {control}
      </li>
    );
  };

  const renderSection = (section: HeaderNavSection) => (
    <div key={section.key} className={styles.menuSection}>
      <ul className={styles.menuList}>{section.items.map(renderItem)}</ul>
    </div>
  );

  const menu = (
    <nav
      aria-label={ariaLabel}
      className={clsx(styles.headerMenu, collapsed && styles.headerMenuCollapsed)}
    >
      {shouldRenderSections ? (
        navSections.map(renderSection)
      ) : (
        <ul className={styles.menuList}>{navItems.map(renderItem)}</ul>
      )}
    </nav>
  );

  return (
    <div ref={containerRef} className={styles.navContainer}>
      {showIndicator ? (
        <div
          ref={indicatorRef}
          className={clsx(styles.indicator, collapsed && styles.indicatorCollapsed)}
        />
      ) : null}
      {guideToolId ? (
        <GuideAnchor id={guideToolId} layout="area">
          {menu}
        </GuideAnchor>
      ) : (
        menu
      )}
      <Separator
        aria-hidden="true"
        className={clsx(styles.divider, labelsHidden && styles.dividerHidden)}
      />
    </div>
  );
}

export default HeaderNav;
