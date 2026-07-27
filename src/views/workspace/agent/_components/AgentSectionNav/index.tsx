import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './style.module.less';

interface AgentSectionNavProps {
  items: ReadonlyArray<readonly [id: string, label: string]>;
  scrollContainerId: string;
}

const getSectionTop = (root: HTMLElement, section: HTMLElement) =>
  section.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;

const getActiveSectionId = (root: HTMLElement, sections: HTMLElement[]) => {
  const lastSection = sections.at(-1);
  if (!lastSection) return '';

  const isAtBottom = Math.ceil(root.scrollTop + root.clientHeight) >= root.scrollHeight - 1;
  if (isAtBottom) return lastSection.id;

  const activationOffset = Math.min(96, root.clientHeight * 0.2);
  const activationPosition = root.scrollTop + activationOffset;
  let activeId = sections[0]?.id ?? '';

  for (const section of sections) {
    if (getSectionTop(root, section) > activationPosition) break;
    activeId = section.id;
  }

  return activeId;
};

function AgentSectionNav({ items, scrollContainerId }: AgentSectionNavProps) {
  const { t } = useTranslation('agent');
  const [activeId, setActiveId] = useState(items[0]?.[0] ?? '');
  const pendingNavigationRef = useRef<{ id: string; top: number } | null>(null);

  /**
   * @wisepen-manual-effect
   * 执行时机：导航条挂载或段落集合变化时订阅滚动容器并同步当前段落。
   * 不可替代原因：段落位置、平滑滚动进度和 scroll 事件都属于浏览器 DOM 状态。
   * cleanup：移除滚动监听，并取消尚未执行的 animation frame 与稳定计时器。
   */
  useEffect(() => {
    const root = document.getElementById(scrollContainerId);
    if (!root) return;
    const sections = items
      .map(([id]) => document.getElementById(id))
      .filter((section): section is HTMLElement => section != null);
    let frameId: number | null = null;
    let settleTimerId: number | null = null;

    const syncActiveSection = () => {
      frameId = null;
      const pendingNavigation = pendingNavigationRef.current;
      if (pendingNavigation) {
        if (Math.abs(root.scrollTop - pendingNavigation.top) > 2) return;
        pendingNavigationRef.current = null;
      }
      const nextId = getActiveSectionId(root, sections);
      if (nextId) setActiveId((current) => (current === nextId ? current : nextId));
    };
    const scheduleSync = () => {
      if (frameId == null) frameId = requestAnimationFrame(syncActiveSection);
    };
    const settleNavigation = () => {
      settleTimerId = null;
      if (!pendingNavigationRef.current) return;
      pendingNavigationRef.current = null;
      scheduleSync();
    };
    const scheduleNavigationSettle = () => {
      if (!pendingNavigationRef.current) return;
      if (settleTimerId != null) window.clearTimeout(settleTimerId);
      settleTimerId = window.setTimeout(settleNavigation, 160);
    };
    const handleScroll = () => {
      scheduleSync();
      scheduleNavigationSettle();
    };
    const cancelPendingNavigation = () => {
      if (!pendingNavigationRef.current) return;
      pendingNavigationRef.current = null;
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
  }, [items, scrollContainerId]);

  return (
    <nav className={styles.nav} aria-label={t('navigation.aria')}>
      <h2>{t('navigation.title')}</h2>
      {items.map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={activeId === id ? styles.active : undefined}
          aria-current={activeId === id ? 'location' : undefined}
          onClick={() => {
            const root = document.getElementById(scrollContainerId);
            const section = document.getElementById(id);
            if (!root || !section) return;
            const top = getSectionTop(root, section);
            setActiveId(id);
            if (Math.abs(root.scrollTop - top) <= 2) return;
            pendingNavigationRef.current = { id, top };
            root.scrollTo({ top, behavior: 'smooth' });
          }}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

export default AgentSectionNav;
