import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import { Spin } from '@/components/base/Feedback';
import { useCourseService } from '@/domains';
import type { ICourseService } from '@/domains/Course';
import { useApiInfiniteScroll } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';
import { sanitizeHtml, SEARCH_HIGHLIGHT_SANITIZE_CONFIG } from '@/utils/html/sanitizeHtml';

import type { indexOutlineSections } from '../../model';
import styles from '../../style.module.scss';

interface CourseOutlineSearchResultsProps {
  courseId: string;
  keyword: string;
  sections: ReturnType<typeof indexOutlineSections>;
  onOpenNode: (nodeId: string) => void;
}

export default function CourseOutlineSearchResults({
  courseId,
  keyword,
  sections,
  onOpenNode,
}: CourseOutlineSearchResultsProps) {
  const { t } = useTranslation('course');
  const courseService = useCourseService();
  const search = useApiInfiniteScroll<Awaited<ReturnType<ICourseService['searchCourseResources']>>>(
    (page) =>
      courseService.searchCourseResources({
        courseId,
        keyword,
        cursor: page?.nextCursor ?? undefined,
      }),
    {
      isNoMore: (page) => page?.nextCursor === null,
      showErrorToast: false,
    }
  );

  const normalizedKeyword = keyword.toLocaleLowerCase();
  const matches = [...sections.values()].filter(({ node }) =>
    node.title.toLocaleLowerCase().includes(normalizedKeyword)
  );
  const results = [
    ...new Map((search.data?.list ?? []).map((hit) => [hit.resourceId, hit])).values(),
  ];
  const total = matches.length + results.length;
  const empty = !search.loading && !search.error && search.noMore && total === 0;

  return (
    <div className={styles.outlineSearchResults}>
      <div role="status" className={styles.outlineSearchStatus}>
        {search.error
          ? parseErrorMessage(search.error)
          : empty
            ? t('outline.searchEmpty')
            : total > 0
              ? t('outline.searchResultCount', { count: total })
              : null}
      </div>
      {search.loading ? <Spin tip={t('outline.searchLoading')} /> : null}
      {total > 0 ? (
        <ul className={styles.outlineSearchList}>
          {matches.map(({ node: { nodeId, title } }) => (
            <li key={nodeId}>
              <AppButton variant="ghost" size="sm" onPress={() => onOpenNode(nodeId)}>
                {title}
              </AppButton>
            </li>
          ))}
          {results.map((hit) => (
            <li key={hit.resourceId} className={styles.outlineSearchHit}>
              {hit.canView ? (
                <AppButton
                  variant="ghost"
                  size="sm"
                  onPress={() => onOpenNode(`${hit.tagIds[0]}:${hit.resourceId}`)}
                >
                  <strong>{hit.resourceName}</strong>
                </AppButton>
              ) : (
                <strong>{hit.resourceName}</strong>
              )}
              {hit.highlightContent && hit.canView ? (
                <span
                  className={styles.outlineSearchSnippet}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(hit.highlightContent, SEARCH_HIGHLIGHT_SANITIZE_CONFIG),
                  }}
                />
              ) : null}
              {hit.canView ? null : <span>{t('outline.resourceReadRestricted')}</span>}
              {hit.tagIds.map((tagId) => {
                const section = sections.get(tagId);
                const label = section?.path.map((id) => sections.get(id)?.node.title).join(' / ');
                if (!label) return null;
                if (!hit.canView) return <span key={tagId}>{label}</span>;
                return (
                  <AppButton
                    key={tagId}
                    variant="ghost"
                    size="sm"
                    aria-label={`${hit.resourceName} · ${label}`}
                    onPress={() => onOpenNode(`${tagId}:${hit.resourceId}`)}
                  >
                    {label}
                  </AppButton>
                );
              })}
            </li>
          ))}
        </ul>
      ) : null}
      {search.error && !search.data ? (
        <AppButton size="sm" variant="secondary" onPress={search.reload}>
          {t('common.retry')}
        </AppButton>
      ) : search.data?.nextCursor ? (
        <AppButton
          size="sm"
          variant="secondary"
          isDisabled={search.loadingMore}
          onPress={search.loadMore}
        >
          {search.loadingMore
            ? t('outline.searchLoading')
            : search.error
              ? t('common.retry')
              : t('outline.loadMoreSearchResults')}
        </AppButton>
      ) : null}
    </div>
  );
}
