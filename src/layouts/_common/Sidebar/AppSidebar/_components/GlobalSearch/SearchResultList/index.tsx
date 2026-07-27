import { Empty, Spin } from '@/components/Feedback';
import EntryIcon from '@/components/Icons/EntryIcon';
import { useResourceService } from '@/domains';
import type { SearchHitItem, SearchResultPage } from '@/domains/Resource';
import { SEARCH_SCOPE } from '@/domains/Resource';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { useWorkspaceNavigationStore } from '@/layouts/Workspace/_store/useWorkspaceNavigationStore';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useInfiniteScroll, useKeyPress } from 'ahooks';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SearchResultListProps } from './index.type';
import styles from './style.module.less';

/** 单页大小：与后端 `@Max(100)` 上限一致，20 是首屏滚动加载的舒适步长 */
const PAGE_SIZE = 20;

const createEmptySearchResult = (): SearchResultPage => ({
  list: [],
  total: 0,
  page: 1,
  size: PAGE_SIZE,
  totalPage: 0,
});

interface SearchHitRowProps {
  item: SearchHitItem;
  active: boolean;
  flatIndex: number;
  onActivate: (flatIndex: number) => void;
  onOpen: (item: SearchHitItem) => void;
}

function SearchHitRow({ item, active, flatIndex, onActivate, onOpen }: SearchHitRowProps) {
  return (
    <li
      data-flat-index={flatIndex}
      className={clsx(styles.row, active && styles.rowActive)}
      onMouseEnter={() => onActivate(flatIndex)}
      onClick={() => onOpen(item)}
    >
      <div className={styles.rowIcon}>
        <EntryIcon
          entryType="resource"
          resourceType={item.resourceType}
          resourceIconType={item.resourceIconType}
          size={18}
        />
      </div>
      <div className={styles.rowText}>
        <div className={styles.rowTitle} dangerouslySetInnerHTML={{ __html: item.resourceName }} />
        {item.highlightContent && (
          <div
            className={styles.rowSnippet}
            dangerouslySetInnerHTML={{ __html: item.highlightContent }}
          />
        )}
      </div>
    </li>
  );
}

/** 单列表渲染 + 无限滚动 + 键盘导航；activeIndex 渲染期 clamp 规避 effect 内 setState */
function SearchResultList({ keyword, onClose }: SearchResultListProps) {
  const { t } = useTranslation('resource');
  const listRef = useRef<HTMLDivElement>(null);
  const openInWorkspace = useOpenInWorkspace();
  const resourceService = useResourceService();
  const trimmed = keyword.trim();

  // ahooks useInfiniteScroll 承载分页/滚动监听/竞态拦截；keyword 变化触发 reloadDeps 回 page 1
  const { data, loading, loadingMore, noMore, mutate } = useInfiniteScroll<SearchResultPage>(
    async (current) => {
      if (trimmed.length === 0) {
        return createEmptySearchResult();
      }

      const nextPage = current ? Math.floor(current.list.length / PAGE_SIZE) + 1 : 1;
      return resourceService.globalSearch({
        keyword: trimmed,
        scope: SEARCH_SCOPE.ALL,
        page: nextPage,
        size: PAGE_SIZE,
      });
    },
    {
      target: listRef,
      isNoMore: (d) => !!d && d.page >= d.totalPage,
      reloadDeps: [trimmed],
      manual: trimmed.length === 0,
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const flatItems = data?.list ?? [];

  const [activeSelection, setActiveSelection] = useState({ keyword: trimmed, index: 0 });
  const activeIndex = activeSelection.keyword === trimmed ? activeSelection.index : 0;
  const clampedActive = flatItems.length === 0 ? 0 : Math.min(activeIndex, flatItems.length - 1);

  /**
   * @wisepen-manual-effect
   * 执行时机：标准化搜索词变化时复位滚动容器和分页缓存。
   * 不可替代原因：滚动位置与 useInfiniteScroll 的可变缓存都在 React 渲染系统之外。
   * cleanup：没有持续订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
    mutate(trimmed.length === 0 ? createEmptySearchResult() : undefined);
  }, [trimmed, mutate]);

  /**
   * @wisepen-manual-effect
   * 执行时机：高亮索引或结果数量变化后，将当前行滚入可见区域。
   * 不可替代原因：scrollIntoView 是对真实 DOM 滚动容器的命令式同步。
   * cleanup：没有持续订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    if (flatItems.length === 0) return;
    const row = listRef.current?.querySelector<HTMLElement>(`[data-flat-index="${clampedActive}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [clampedActive, flatItems.length]);

  const handleOpenHit = (item: SearchHitItem) => {
    onClose();
    openInWorkspace({
      resourceId: item.resourceId,
      resourceType: item.resourceType,
      resourceName: item.resourceName,
      driveLocation: { scope: useWorkspaceNavigationStore.getState().location.scope },
    });
  };

  useKeyPress(
    'uparrow',
    (e) => {
      if (flatItems.length === 0) return;
      e.preventDefault();
      setActiveSelection({ keyword: trimmed, index: Math.max(0, clampedActive - 1) });
    },
    { exactMatch: true }
  );
  useKeyPress(
    'downarrow',
    (e) => {
      if (flatItems.length === 0) return;
      e.preventDefault();
      setActiveSelection({
        keyword: trimmed,
        index: Math.min(flatItems.length - 1, clampedActive + 1),
      });
    },
    { exactMatch: true }
  );
  useKeyPress(
    'enter',
    () => {
      const item = flatItems[clampedActive];
      if (item) handleOpenHit(item);
    },
    { exactMatch: true }
  );

  const hasKeyword = trimmed.length > 0;
  const hasHits = hasKeyword && flatItems.length > 0;
  const initialLoading = hasKeyword && loading && flatItems.length === 0;

  return (
    <div ref={listRef} className={styles.list}>
      {initialLoading ? (
        <div className={styles.initialLoading}>
          <Spin size="small" />
        </div>
      ) : hasHits ? (
        <>
          <ul className={styles.items}>
            {flatItems.map((item, flatIndex) => (
              <SearchHitRow
                key={item.resourceId}
                item={item}
                active={flatIndex === clampedActive}
                flatIndex={flatIndex}
                onActivate={(index) => setActiveSelection({ keyword: trimmed, index })}
                onOpen={handleOpenHit}
              />
            ))}
          </ul>

          {loadingMore && (
            <div className={styles.loadingMore}>
              <Spin size="small" />
            </div>
          )}
          {!loadingMore && noMore && (
            <div className={styles.footerHint}>{t('search.allResultsShown')}</div>
          )}
        </>
      ) : (
        <div className={styles.emptyWrapper}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={hasKeyword ? t('search.noResults') : t('search.emptyHint')}
          />
        </div>
      )}
    </div>
  );
}

export default SearchResultList;
