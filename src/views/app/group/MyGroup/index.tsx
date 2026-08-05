import CourseCard from '@/components/Course/CourseCard';
import CreateCourseModal from '@/components/Course/CreateCourseModal';
import JoinCourseModal from '@/components/Course/JoinCourseModal';
import { Empty } from '@/components/Feedback';
import Select from '@/components/Input/Select';
import { useCourseService, useGroupService, useUserService } from '@/domains';
import type { CourseSummary } from '@/domains/Course';
import type { Group } from '@/domains/Group';
import { GROUP_ROLE_FILTER_MAP, GROUP_TYPE } from '@/domains/Group';
import { IDENTITY } from '@/domains/User';
import { Button, Card, ListBox, Pagination, Skeleton, Tabs, toast } from '@heroui/react';
import { usePagination, useRequest } from 'ahooks';
import { Plus, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
type GroupSection = 'groups' | 'courseGroups';
type GroupListItem = { kind: 'group'; group: Group } | { kind: 'course'; course: CourseSummary };

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
  const { t } = useTranslation(['group', 'course']);
  const groupService = useGroupService();
  const courseService = useCourseService();
  const userService = useUserService();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialInviteCode = searchParams.get('inviteCode') ?? undefined;
  const [activeSection, setActiveSection] = useState<GroupSection>(() =>
    searchParams.get('section') === 'courseGroups' ? 'courseGroups' : 'groups'
  );
  const [activeTab, setActiveTab] = useState<string>('all');
  const [joinGroupModalOpen, setJoinGroupModalOpen] = useState(() => Boolean(initialInviteCode));
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [joinCourseModalOpen, setJoinCourseModalOpen] = useState(false);
  const [createCourseModalOpen, setCreateCourseModalOpen] = useState(false);
  const userRequest = useRequest(() => userService.getUserInfo());
  const identityType = userRequest.data?.identityType;
  const canCreateCourse = identityType === IDENTITY.TEACHER || identityType === IDENTITY.ADMIN;
  const canJoinCourse = identityType === IDENTITY.STUDENT || identityType === IDENTITY.ADMIN;

  const groupRoleFilter =
    activeSection === 'courseGroups'
      ? GROUP_ROLE_FILTER_MAP.all
      : (GROUP_ROLE_FILTER_MAP[activeTab] ?? GROUP_ROLE_FILTER_MAP.all);

  const {
    data: groupsData,
    loading,
    refresh: refreshGroups,
    pagination: { current: pageNum, pageSize: size, onChange: onPageChange },
  } = usePagination(
    async ({ current, pageSize }) => {
      if (activeSection === 'courseGroups') {
        const coursePage = await courseService.listMyCourses({ page: current, size: pageSize });
        return {
          list: coursePage.list.map((course): GroupListItem => ({ kind: 'course', course })),
          total: coursePage.total,
        };
      }

      const allGroups = await groupService.fetchAllMyGroups(groupRoleFilter);
      const matchingGroups = allGroups.filter((group) => group.groupType === GROUP_TYPE.NORMAL);
      const start = Math.max(0, (current - 1) * pageSize);
      return {
        list: matchingGroups
          .slice(start, start + pageSize)
          .map((group): GroupListItem => ({ kind: 'group', group })),
        total: matchingGroups.length,
      };
    },
    {
      defaultCurrent: 1,
      defaultPageSize: PAGE_SIZE,
      refreshDeps: [groupRoleFilter, activeSection],
      onError: () => {
        toast.danger(t('list.loadFailed'));
      },
    }
  );
  const listItems: GroupListItem[] = groupsData?.list ?? [];
  const total = groupsData?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / size), 1);
  const pages = buildPaginationItems(pageNum, totalPages);
  const start = total === 0 ? 0 : (pageNum - 1) * size + 1;
  const end = Math.min(pageNum * size, total);
  const emptyDescription =
    activeSection === 'courseGroups' ? t('list.empty', { ns: 'course' }) : t('list.empty');
  const handleSectionChange = (key: GroupSection) => {
    setActiveSection(key);
    onPageChange(1, size);
  };

  const handleModalSuccess = () => {
    setJoinGroupModalOpen(false);
    setCreateGroupModalOpen(false);
    if (initialInviteCode) {
      navigate('/app/my-group', { replace: true });
    }
    void refreshGroups();
  };

  const handleGroupClick = (group: Group) => {
    if (group.groupId) {
      navigate(`/app/my-group/${group.groupId}`);
    }
  };

  const handleCourseClick = (course: CourseSummary) => {
    navigate(`/app/course/${course.courseId}/home`);
  };

  return (
    <div className={layout.pageContainer}>
      <div className={layout.pageHeaderWithActions}>
        <div>
          <h1 className={layout.pageTitle}>{t('list.title')}</h1>
          <span className={layout.pageSubtitle}>{t('list.subtitle')}</span>
        </div>
        {activeSection === 'groups' ? (
          <div className={layout.actionsRow}>
            <Button variant="secondary" onPress={() => setCreateGroupModalOpen(true)}>
              <Plus size={16} aria-hidden="true" />
              {t('list.create')}
            </Button>
            <Button variant="primary" onPress={() => setJoinGroupModalOpen(true)}>
              <UserPlus size={16} aria-hidden="true" />
              {t('list.join')}
            </Button>
          </div>
        ) : canCreateCourse || canJoinCourse ? (
          <div className={layout.actionsRow}>
            {canCreateCourse ? (
              <Button
                variant={canJoinCourse ? 'secondary' : 'primary'}
                onPress={() => setCreateCourseModalOpen(true)}
              >
                <Plus size={16} aria-hidden="true" />
                {t('list.create', { ns: 'course' })}
              </Button>
            ) : null}
            {canJoinCourse ? (
              <Button variant="primary" onPress={() => setJoinCourseModalOpen(true)}>
                <UserPlus size={16} aria-hidden="true" />
                {t('list.join', { ns: 'course' })}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={page.listControls}>
        <Tabs
          variant="secondary"
          selectedKey={activeSection}
          onSelectionChange={(key) => {
            const nextSection = String(key);
            if (nextSection === 'groups' || nextSection === 'courseGroups') {
              handleSectionChange(nextSection);
            }
          }}
        >
          <Tabs.ListContainer>
            <Tabs.List className={page.filterTabsList} aria-label={t('list.navigationAria')}>
              {[
                { key: 'groups', label: t('list.myGroups') },
                { key: 'courseGroups', label: t('list.myCourseGroups') },
              ].map((item) => (
                <Tabs.Tab key={item.key} id={item.key} className={page.filterTab}>
                  {item.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
        {activeSection === 'groups' ? (
          <Select
            aria-label={t('list.filterAria')}
            value={activeTab}
            onChange={(value) => {
              if (typeof value !== 'string') {
                return;
              }
              setActiveTab(value);
              onPageChange(1, size);
            }}
            className={page.roleFilter}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {[
                  { key: 'all', label: t('list.all') },
                  { key: 'joined', label: t('list.joined') },
                  { key: 'managed', label: t('list.managed') },
                ].map((item) => (
                  <ListBox.Item key={item.key} id={item.key} textValue={item.label}>
                    {item.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        ) : null}
      </div>

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
          {listItems.length === 0 ? (
            <div className={page.emptyState}>
              <Empty description={emptyDescription} />
            </div>
          ) : (
            <div className={page.groupGrid}>
              {listItems.map((item) =>
                item.kind === 'course' ? (
                  <div key={item.course.courseId} className={page.groupGridItem}>
                    <CourseCard course={item.course} onClick={handleCourseClick} />
                  </div>
                ) : (
                  <div key={item.group.groupId} className={page.groupGridItem}>
                    <GroupCard group={item.group} onClick={handleGroupClick} />
                  </div>
                )
              )}
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
        initialInviteCode={initialInviteCode}
      />
      <CreateGroupModal
        isOpen={createGroupModalOpen}
        onOpenChange={setCreateGroupModalOpen}
        onSuccess={handleModalSuccess}
      />
      <JoinCourseModal
        isOpen={joinCourseModalOpen}
        onOpenChange={setJoinCourseModalOpen}
        onJoined={refreshGroups}
      />
      <CreateCourseModal
        isOpen={createCourseModalOpen}
        onOpenChange={setCreateCourseModalOpen}
        onCreated={(courseId) => navigate(`/app/course/${courseId}/home`)}
      />
    </div>
  );
}

export default MyGroup;
