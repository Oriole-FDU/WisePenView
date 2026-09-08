import { CommandGroup, CommandItem } from '@/components/_shadcn';
import { Empty, Spin } from '@/components/Feedback';
import EntryIcon from '@/components/Icons/EntryIcon';
import { useResourceService } from '@/domains';
import type { SearchHitItem, SearchResultPage } from '@/domains/Resource';
import { SEARCH_SCOPE } from '@/domains/Resource';
import { useApiInfiniteScroll } from '@/hooks/useApi';
import { useOpenResource } from '@/hooks/useOpenResource';
import { SEARCH_HIGHLIGHT_SANITIZE_CONFIG, sanitizeHtml } from '@/utils/sanitizeHtml';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useState, type CSSProperties, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './style.module.less';

const PAGE_SIZE = 20;
const RESOURCE_ITEM_ESTIMATE_SIZE = 60;
const RESOURCE_ITEM_OVERSCAN = 6;
const RESOURCE_GROUP_ID = 'resource-search-results';
const RESOURCE_GROUP_SELECTOR = '[data-resource-search-group]';

interface CommandSearchResultPage extends SearchResultPage {
  query: string;
}

interface ResourceSearchResultsProps {
  keyword: string;
  layoutKeyword: string;
  onSelect: () => void;
  viewportRef: RefObject<HTMLDivElement | null>;
}

const createEmptySearchResult = (query: string): CommandSearchResultPage => ({
  query,
  list: [],
  total: 0,
  page: 1,
  size: PAGE_SIZE,
  totalPage: 0,
});

const toPlainText = (markup: string): string => {
  return new DOMParser().parseFromString(markup, 'text/html').body.textContent ?? '';
};

function ResourceResultItem({
  item,
  onSelect,
  dataIndex,
  measureElement,
}: {
  item: SearchHitItem;
  onSelect: () => void;
  dataIndex: number;
  measureElement: (element: Element | null) => void;
}) {
  const openResource = useOpenResource();
  const plainName = toPlainText(item.resourceName);
  const sanitizedName = sanitizeHtml(item.resourceName, SEARCH_HIGHLIGHT_SANITIZE_CONFIG);
  const sanitizedHighlightContent = item.highlightContent
    ? sanitizeHtml(item.highlightContent, SEARCH_HIGHLIGHT_SANITIZE_CONFIG)
    : null;

  const handleSelect = () => {
    onSelect();
    openResource({
      resourceId: item.resourceId,
      resourceType: item.resourceType,
      resourceName: plainName,
    });
  };

  return (
    <CommandItem
      value={`resource:${item.resourceId}`}
      keywords={[plainName, toPlainText(item.highlightContent ?? '')]}
      onSelect={handleSelect}
      data-index={dataIndex}
      ref={measureElement}
    >
      <span className={styles.resourceIcon}>
        <EntryIcon
          entryType="resource"
          resourceType={item.resourceType}
          resourceIconType={item.resourceIconType}
          size={18}
        />
      </span>
      <span className={styles.resourceText}>
        <span
          className={styles.resourceTitle}
          dangerouslySetInnerHTML={{ __html: sanitizedName }}
        />
        {sanitizedHighlightContent ? (
          <span
            className={styles.resourceSnippet}
            dangerouslySetInnerHTML={{ __html: sanitizedHighlightContent }}
          />
        ) : null}
      </span>
    </CommandItem>
  );
}

function ResourceSearchResults({
  keyword,
  layoutKeyword,
  onSelect,
  viewportRef,
}: ResourceSearchResultsProps) {
  const { t } = useTranslation(['shell', 'resource']);
  const resourceService = useResourceService();
  const query = keyword.trim();
  const [resourceListOffset, setResourceListOffset] = useState(0);

  const { data, loading, loadingMore, noMore, mutate } =
    useApiInfiniteScroll<CommandSearchResultPage>(
      async (current) => {
        if (!query) return createEmptySearchResult(query);

        const currentList = current?.query === query ? current.list : [];
        const nextPage = Math.floor(currentList.length / PAGE_SIZE) + 1;
        const result = await resourceService.globalSearch({
          keyword: query,
          scope: SEARCH_SCOPE.ALL,
          page: nextPage,
          size: PAGE_SIZE,
        });
        return { ...result, query };
      },
      {
        target: viewportRef,
        isNoMore: (result) => !!result && result.page >= result.totalPage,
        reloadDeps: [query],
        manual: !query,
      }
    );

  const items = data?.query === query ? data.list : [];
  const initialLoading = loading && items.length === 0;

  /**
   * @wisepen-manual-effect
   * 执行时机：标准化搜索词变化时复位滚动位置与无限列表缓存。
   * 不可替代原因：滚动位置和 useInfiniteScroll 缓存属于 React 渲染之外的命令式状态。
   * cleanup：没有持续订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
    mutate(createEmptySearchResult(query));
  }, [query, mutate, viewportRef]);

  /**
   * @wisepen-manual-effect
   * 执行时机：每次渲染提交后重新测量资源组在共享滚动容器中的起始位置。
   * 不可替代原因：前置命令分组会随外层搜索词变化而增删，虚拟列表需要这个命令式布局偏移来计算可视范围。
   * cleanup：没有持续订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    const viewport = viewportRef.current;
    const group = viewport?.querySelector<HTMLElement>(RESOURCE_GROUP_SELECTOR);
    if (!viewport || !group) {
      setResourceListOffset((current) => (current === 0 ? current : 0));
      return;
    }

    const heading = group.querySelector<HTMLElement>('[slot="heading"]');
    const viewportRect = viewport.getBoundingClientRect();
    const nextOffset = Math.max(
      0,
      group.getBoundingClientRect().top -
        viewportRect.top +
        viewport.scrollTop +
        (heading?.offsetHeight ?? 0)
    );
    setResourceListOffset((current) => (current === nextOffset ? current : nextOffset));
  }, [layoutKeyword, query, items.length, loading, loadingMore, noMore, viewportRef]);

  // eslint-disable-next-line react-hooks/incompatible-library -- 资源结果高度包含摘要，虚拟列表需要动态测量真实高度。
  const resourceVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => RESOURCE_ITEM_ESTIMATE_SIZE,
    overscan: RESOURCE_ITEM_OVERSCAN,
    scrollMargin: resourceListOffset,
    getItemKey: (index) => items[index]?.resourceId ?? index,
  });
  const virtualItems = resourceVirtualizer.getVirtualItems();
  const virtualTopPadding = virtualItems[0]
    ? Math.max(virtualItems[0].start - resourceListOffset, 0)
    : 0;
  const virtualBottomPadding =
    virtualItems.length > 0
      ? Math.max(
          resourceVirtualizer.getTotalSize() -
            (virtualItems[virtualItems.length - 1]?.end ?? resourceListOffset) +
            resourceListOffset,
          0
        )
      : 0;

  if (!query) return null;

  return (
    <CommandGroup
      value={RESOURCE_GROUP_ID}
      heading={t('commandPalette.groups.resources', { ns: 'shell' })}
      data-resource-search-group="true"
    >
      {initialLoading ? (
        <CommandItem
          value="resource-search-loading"
          textValue={t('commandPalette.searching', { ns: 'shell' })}
          disabled
          className={styles.resourceState}
        >
          <Spin size="small" />
          <span>{t('commandPalette.searching', { ns: 'shell' })}</span>
        </CommandItem>
      ) : items.length > 0 ? (
        <>
          {virtualTopPadding > 0 ? (
            <CommandItem
              value="resource-search-virtual-top"
              textValue=""
              disabled
              aria-hidden
              className={styles.virtualSpacer}
              style={{ height: virtualTopPadding } as CSSProperties}
            />
          ) : null}
          {virtualItems.map((virtualItem) => {
            const item = items[virtualItem.index];
            if (!item) return null;
            return (
              <ResourceResultItem
                key={item.resourceId}
                item={item}
                dataIndex={virtualItem.index}
                measureElement={resourceVirtualizer.measureElement}
                onSelect={onSelect}
              />
            );
          })}
          {virtualBottomPadding > 0 ? (
            <CommandItem
              value="resource-search-virtual-bottom"
              textValue=""
              disabled
              aria-hidden
              className={styles.virtualSpacer}
              style={{ height: virtualBottomPadding } as CSSProperties}
            />
          ) : null}
          {loadingMore ? (
            <CommandItem
              value="resource-search-loading-more"
              textValue={t('commandPalette.searching', { ns: 'shell' })}
              disabled
              className={styles.loadingMore}
            >
              <Spin size="small" />
            </CommandItem>
          ) : null}
          {!loadingMore && noMore ? (
            <CommandItem
              value="resource-search-complete"
              textValue={t('search.allResultsShown', { ns: 'resource' })}
              disabled
              className={styles.resultFooter}
            >
              {t('search.allResultsShown', { ns: 'resource' })}
            </CommandItem>
          ) : null}
        </>
      ) : (
        <CommandItem
          value="resource-search-empty"
          textValue={t('search.noResults', { ns: 'resource' })}
          disabled
          className={styles.emptyState}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('search.noResults', { ns: 'resource' })}
          />
        </CommandItem>
      )}
    </CommandGroup>
  );
}

export default ResourceSearchResults;
