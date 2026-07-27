import { Empty } from '@/components/Feedback';
import SegmentedTabs from '@/components/SegmentedTabs';
import { useGroupService } from '@/domains';
import type { FetchGroupListRequest, Group } from '@/domains/Group';
import { GROUP_ROLE_FILTER_MAP } from '@/domains/Group';
import { Button, Card, Pagination, Skeleton, toast } from '@heroui/react';
import { usePagination } from 'ahooks';
import { Plus, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import GroupCard from '../_components/GroupCard';
import { CreateGroupModal, JoinGroupModal } from '../_components/GroupModals';
import layout from '../style.module.less';
import page from './style.module.less';

const PAGE_SIZE = 8;
const PAGINATION_SIBLING_COUNT = 1;
const GROUP_CARD_SKELETON_KEYS = Array.from(
  { length: PAGE_SIZE },
  (_, index) => `group-card-skeleton-${index + 1}`
);

type PaginationPageItem = number | 'ellipsis';

function buildPaginationItems(currentPage: number, totalPages: number): PaginationPageItem[] {
  const pages = new Set<number>([1, totalPages]);

  for (
    let pageNumber = currentPage - PAGINATION_SIBLING_COUNT;
    pageNumber <= currentPage + PAGINATION_SIBLING_COUNT;
    pageNumber += 1
  ) {
    if (pageNumber > 1 && pageNumber < totalPages) {
      pages.add(pageNumber);
    }
  }

  const sortedPages = [...pages].sort((a, b) => a - b);

  return sortedPages.flatMap((pageNumber, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage && pageNumber - previousPage > 1) {
      return ['ellipsis', pageNumber] as PaginationPageItem[];
    }
    return [pageNumber];
  });
}

function GroupCardSkeleton() {
  return (
    <Card className={page.skeletonCard} aria-hidden="true">
      <Skeleton animationType="shimmer" className={page.skeletonCover} />
      <div className={page.skeletonBody}>
        <Skeleton animationType="shimmer" className={page.skeletonTitle} />
        <div className={page.skeletonFooter}>
          <Skeleton animationType="shimmer" className={page.skeletonAvatar} />
          <Skeleton animationType="shimmer" className={page.skeletonOwner} />
          <Skeleton animationType="shimmer" className={page.skeletonMemberCount} />
        </div>
      </div>
    </Card>
  );
}

function MyGroup() {
  const { t } = useTranslation('group');
  const groupService = useGroupService();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [joinGroupModalOpen, setJoinGroupModalOpen] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);

  const groupRoleFilter = GROUP_ROLE_FILTER_MAP[activeTab] ?? GROUP_ROLE_FILTER_MAP.all;

  const {
    data: groupsData,
    loading,
    refresh: refreshGroups,
    pagination: { current: pageNum, pageSize: size, onChange: onPageChange },
  } = usePagination(
    async ({ current, pageSize }) => {
      const params: FetchGroupListRequest = {
        groupRoleFilter: groupRoleFilter,
        page: current,
        size: pageSize,
      };
      const { groups, total } = await groupService.fetchGroupList(params);
      return { list: groups, total };
    },
    {
      defaultCurrent: 1,
      defaultPageSize: PAGE_SIZE,
      refreshDeps: [groupRoleFilter],
      onError: () => {
        toast.danger(t('list.loadFailed'));
      },
    }
  );
  const groups: Group[] = groupsData?.list ?? [];
  const total = groupsData?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / size), 1);
  const pages = buildPaginationItems(pageNum, totalPages);
  const start = total === 0 ? 0 : (pageNum - 1) * size + 1;
  const end = Math.min(pageNum * size, total);
  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleModalSuccess = () => {
    setJoinGroupModalOpen(false);
    setCreateGroupModalOpen(false);
    void refreshGroups();
  };

  const handleGroupClick = (group: Group) => {
    if (group.groupId) {
      navigate(`/app/my-group/${group.groupId}`);
    }
  };

  return (
    <div className={layout.pageContainer}>
      <div className={layout.pageHeaderWithActions}>
        <div>
          <h1 className={layout.pageTitle}>{t('list.title')}</h1>
          <span className={layout.pageSubtitle}>{t('list.subtitle')}</span>
        </div>
        <div className={layout.actionsRow}>
          <Button onPress={() => setJoinGroupModalOpen(true)}>
            <UserPlus size={16} aria-hidden="true" />
            {t('list.join')}
          </Button>
          <Button variant="primary" onPress={() => setCreateGroupModalOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            {t('list.create')}
          </Button>
        </div>
      </div>

      <SegmentedTabs
        ariaLabel={t('list.filterAria')}
        selectedKey={activeTab}
        onSelectionChange={handleTabChange}
        items={[
          { key: 'all', label: t('list.all') },
          { key: 'joined', label: t('list.joined') },
          { key: 'managed', label: t('list.managed') },
        ]}
        className={layout.detailTabs}
        size="sm"
      />

      {loading ? (
        <div
          className={page.groupGrid}
          role="status"
          aria-live="polite"
          aria-label={t('list.loading')}
        >
          {GROUP_CARD_SKELETON_KEYS.map((key) => (
            <div key={key} className={page.groupGridItem}>
              <GroupCardSkeleton />
            </div>
          ))}
        </div>
      ) : (
        <>
          {groups.length === 0 ? (
            <div className={page.emptyState}>
              <Empty description={t('list.empty')} />
            </div>
          ) : (
            <div className={page.groupGrid}>
              {groups.map((group) => (
                <div key={group.groupId} className={page.groupGridItem}>
                  <GroupCard group={group} onClick={handleGroupClick} />
                </div>
              ))}
            </div>
          )}

          {total > 0 && (
            <div className={page.paginationWrap}>
              <Pagination size="sm">
                <Pagination.Summary>{t('list.summary', { start, end, total })}</Pagination.Summary>
                <Pagination.Content>
                  <Pagination.Item>
                    <Pagination.Previous
                      isDisabled={pageNum <= 1}
                      onPress={() => onPageChange(Math.max(1, pageNum - 1), size)}
                    >
                      <Pagination.PreviousIcon />
                      {t('list.previous')}
                    </Pagination.Previous>
                  </Pagination.Item>
                  {pages.map((targetPage, index) =>
                    targetPage === 'ellipsis' ? (
                      <Pagination.Item key={`ellipsis-${index}`}>
                        <Pagination.Ellipsis />
                      </Pagination.Item>
                    ) : (
                      <Pagination.Item key={targetPage}>
                        <Pagination.Link
                          isActive={targetPage === pageNum}
                          onPress={() => onPageChange(targetPage, size)}
                        >
                          {targetPage}
                        </Pagination.Link>
                      </Pagination.Item>
                    )
                  )}
                  <Pagination.Item>
                    <Pagination.Next
                      isDisabled={pageNum >= totalPages}
                      onPress={() => onPageChange(Math.min(totalPages, pageNum + 1), size)}
                    >
                      {t('list.next')}
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </div>
          )}
        </>
      )}

      <JoinGroupModal
        isOpen={joinGroupModalOpen}
        onOpenChange={setJoinGroupModalOpen}
        onSuccess={handleModalSuccess}
      />
      <CreateGroupModal
        isOpen={createGroupModalOpen}
        onOpenChange={setCreateGroupModalOpen}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}

export default MyGroup;
