import { Switch } from '@heroui/react';
import type { ReactNode, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/cn';

import styles from './style.module.less';

interface AppFormSectionProps {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  variant?: 'plain' | 'editor';
  className?: string;
  innerClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  actionsClassName?: string;
}

interface AppFormRowsProps {
  children: ReactNode;
  className?: string;
}

interface AppFormRowProps {
  title: ReactNode;
  description?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  control?: ReactNode;
  children?: ReactNode;
  className?: string;
  copyClassName?: string;
  controlClassName?: string;
  onChange?: (value: boolean) => void;
}

export interface AppFormAnchorNavItem {
  id: string;
  label: ReactNode;
}

export interface AppFormAnchorNavGroup {
  title?: ReactNode;
  items: ReadonlyArray<AppFormAnchorNavItem>;
}

type AppFormAnchorNavEntry = AppFormAnchorNavItem | AppFormAnchorNavGroup;

type AnchorNavigationState =
  | { type: 'idle' }
  | {
      type: 'locked';
      id: string;
      targetTop: number;
      settled: boolean;
    };

interface AppFormAnchorNavProps {
  items: ReadonlyArray<AppFormAnchorNavEntry>;
  ariaLabel: string;
  title?: ReactNode;
  scrollContainerId?: string;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  scrollOffset?: number;
  activationOffset?: number;
  className?: string;
  groupClassName?: string;
}

const isAnchorGroup = (entry: AppFormAnchorNavEntry): entry is AppFormAnchorNavGroup =>
  !('id' in entry);

const flattenAnchorItems = (items: ReadonlyArray<AppFormAnchorNavEntry>) =>
  items.flatMap((entry) => (isAnchorGroup(entry) ? entry.items : [entry]));

const getSectionTop = (root: HTMLElement, section: HTMLElement) =>
  section.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;

const getActivationOffset = (root: HTMLElement, scrollOffset: number, activationOffset?: number) =>
  activationOffset ?? (scrollOffset > 0 ? scrollOffset : Math.min(96, root.clientHeight * 0.2));

const getActiveSectionId = (
  root: HTMLElement,
  sections: HTMLElement[],
  scrollOffset: number,
  activationOffset?: number
) => {
  const lastSection = sections.at(-1);
  if (!lastSection) return '';

  const isAtBottom = Math.ceil(root.scrollTop + root.clientHeight) >= root.scrollHeight - 1;
  if (isAtBottom) return lastSection.id;

  const activationPosition =
    root.scrollTop + getActivationOffset(root, scrollOffset, activationOffset);
  let activeId = sections[0]?.id ?? '';

  for (const section of sections) {
    if (getSectionTop(root, section) > activationPosition) break;
    activeId = section.id;
  }

  return activeId;
};

function AppFormSection({
  id,
  title,
  description,
  actions,
  children,
  variant = 'plain',
  className,
  innerClassName,
  headerClassName,
  titleClassName,
  descriptionClassName,
  actionsClassName,
}: AppFormSectionProps) {
  return (
    <section id={id} className={cn(styles.section, className)} data-variant={variant}>
      <div className={cn(styles.sectionInner, innerClassName)}>
        <header className={cn(styles.sectionHeader, headerClassName)}>
          <div className={styles.sectionCopy}>
            <h2 className={cn(styles.sectionTitle, titleClassName)}>{title}</h2>
            {description ? (
              <p className={cn(styles.sectionDescription, descriptionClassName)}>{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className={cn(styles.sectionActions, actionsClassName)}>{actions}</div>
          ) : null}
        </header>
        {children}
      </div>
    </section>
  );
}

function AppFormRows({ children, className }: AppFormRowsProps) {
  return <div className={cn(styles.rows, className)}>{children}</div>;
}

function AppFormRow({
  title,
  description,
  selected,
  disabled,
  control,
  children,
  className,
  copyClassName,
  controlClassName,
  onChange,
}: AppFormRowProps) {
  const resolvedControl =
    control ??
    (typeof selected === 'boolean' && onChange ? (
      <Switch
        size="md"
        aria-label={String(title)}
        isSelected={selected}
        isDisabled={disabled}
        onChange={onChange}
      >
        <Switch.Content className={styles.switchContent}>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
    ) : null);

  return (
    <div className={cn(styles.row, className)}>
      <div className={cn(styles.rowCopy, copyClassName)}>
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
        {children}
      </div>
      {resolvedControl ? (
        <div className={cn(styles.rowControl, controlClassName)}>{resolvedControl}</div>
      ) : null}
    </div>
  );
}

function AppFormAnchorNav({
  items,
  ariaLabel,
  title,
  scrollContainerId,
  scrollContainerRef,
  scrollOffset = 0,
  activationOffset,
  className,
  groupClassName,
}: AppFormAnchorNavProps) {
  const [activeId, setActiveId] = useState(flattenAnchorItems(items)[0]?.id ?? '');
  const itemIdsKey = flattenAnchorItems(items)
    .map((item) => item.id)
    .join('\u001f');
  const navigationStateRef = useRef<AnchorNavigationState>({ type: 'idle' });

  /**
   * @wisepen-manual-effect
   * 执行时机：导航挂载、锚点集合或滚动容器变化后，订阅容器滚动并同步当前锚点。
   * 不可替代原因：锚点位置、平滑滚动、触底跟随和程序化跳转锁定都只能从浏览器 DOM 状态读取。
   * cleanup：移除滚动与输入监听，释放 ResizeObserver、animation frame 和延迟计时器。
   */
  useEffect(() => {
    const root =
      scrollContainerRef?.current ??
      (scrollContainerId ? document.getElementById(scrollContainerId) : null);
    if (!root) return;
    const sectionIds = itemIdsKey ? itemIdsKey.split('\u001f') : [];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section != null);
    let frameId: number | null = null;
    let settleTimerId: number | null = null;

    const lockActiveSection = (id: string, targetTop: number, settled: boolean) => {
      navigationStateRef.current = { type: 'locked', id, targetTop, settled };
      setActiveId((current) => (current === id ? current : id));
    };

    const syncActiveSection = () => {
      frameId = null;
      const navigationState = navigationStateRef.current;
      if (navigationState.type === 'locked') {
        if (!navigationState.settled && Math.abs(root.scrollTop - navigationState.targetTop) <= 2) {
          lockActiveSection(navigationState.id, navigationState.targetTop, true);
          return;
        }
        setActiveId((current) => (current === navigationState.id ? current : navigationState.id));
        return;
      }
      const nextId = getActiveSectionId(root, sections, scrollOffset, activationOffset);
      if (nextId) setActiveId((current) => (current === nextId ? current : nextId));
    };
    const scheduleSync = () => {
      if (frameId == null) frameId = requestAnimationFrame(syncActiveSection);
    };
    const settleNavigation = () => {
      settleTimerId = null;
      const navigationState = navigationStateRef.current;
      if (navigationState.type !== 'locked') return;
      lockActiveSection(navigationState.id, navigationState.targetTop, true);
    };
    const scheduleNavigationSettle = () => {
      const navigationState = navigationStateRef.current;
      if (navigationState.type !== 'locked' || navigationState.settled) return;
      if (settleTimerId != null) window.clearTimeout(settleTimerId);
      settleTimerId = window.setTimeout(settleNavigation, 160);
    };
    const handleScroll = () => {
      scheduleSync();
      scheduleNavigationSettle();
    };
    const cancelPendingNavigation = () => {
      if (navigationStateRef.current.type === 'idle') return;
      navigationStateRef.current = { type: 'idle' };
      if (settleTimerId != null) window.clearTimeout(settleTimerId);
      settleTimerId = null;
      scheduleSync();
    };

    const resizeObserver = new ResizeObserver(scheduleSync);
    resizeObserver.observe(root);
    sections.forEach((section) => resizeObserver.observe(section));
    root.addEventListener('scroll', handleScroll, { passive: true });
    root.addEventListener('scrollend', settleNavigation);
    root.addEventListener('wheel', cancelPendingNavigation, { passive: true });
    root.addEventListener('touchstart', cancelPendingNavigation, { passive: true });
    root.addEventListener('pointerdown', cancelPendingNavigation, { passive: true });
    scheduleSync();

    return () => {
      root.removeEventListener('scroll', handleScroll);
      root.removeEventListener('scrollend', settleNavigation);
      root.removeEventListener('wheel', cancelPendingNavigation);
      root.removeEventListener('touchstart', cancelPendingNavigation);
      root.removeEventListener('pointerdown', cancelPendingNavigation);
      resizeObserver.disconnect();
      if (frameId != null) cancelAnimationFrame(frameId);
      if (settleTimerId != null) window.clearTimeout(settleTimerId);
    };
  }, [activationOffset, itemIdsKey, scrollContainerId, scrollContainerRef, scrollOffset]);

  const handleNavigate = (id: string) => {
    const root =
      scrollContainerRef?.current ??
      (scrollContainerId ? document.getElementById(scrollContainerId) : null);
    const section = document.getElementById(id);
    if (!root || !section) return;
    const maxScrollTop = Math.max(0, root.scrollHeight - root.clientHeight);
    const top = Math.min(Math.max(0, getSectionTop(root, section) - scrollOffset), maxScrollTop);
    navigationStateRef.current = {
      type: 'locked',
      id,
      targetTop: top,
      settled: Math.abs(root.scrollTop - top) <= 2,
    };
    setActiveId(id);
    if (Math.abs(root.scrollTop - top) <= 2) return;
    root.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <nav className={cn(styles.anchorNav, className)} aria-label={ariaLabel}>
      {title ? <h2>{title}</h2> : null}
      {items.map((entry) => {
        if (isAnchorGroup(entry)) {
          const groupKey =
            typeof entry.title === 'string'
              ? entry.title
              : entry.items.map((item) => item.id).join(':');
          return (
            <div key={groupKey} className={cn(styles.anchorGroup, groupClassName)}>
              {entry.title ? <h2>{entry.title}</h2> : null}
              {entry.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={activeId === item.id ? styles.active : undefined}
                  aria-current={activeId === item.id ? 'location' : undefined}
                  onClick={() => handleNavigate(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          );
        }
        return (
          <button
            key={entry.id}
            type="button"
            className={activeId === entry.id ? styles.active : undefined}
            aria-current={activeId === entry.id ? 'location' : undefined}
            onClick={() => handleNavigate(entry.id)}
          >
            {entry.label}
          </button>
        );
      })}
    </nav>
  );
}

const AppForm = {
  Section: AppFormSection,
  Rows: AppFormRows,
  Row: AppFormRow,
  AnchorNav: AppFormAnchorNav,
};

export { AppFormAnchorNav, AppFormRow, AppFormRows, AppFormSection };
export default AppForm;
