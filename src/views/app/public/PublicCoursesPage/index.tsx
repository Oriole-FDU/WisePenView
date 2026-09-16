import { Plus, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { Empty, Spin } from '@/components/base/Feedback';
import CourseCard from '@/components/business/CourseCard';
import { useCourseService, useUserService } from '@/domains';
import { IDENTITY } from '@/domains/User';
import { useApi } from '@/hooks/useApi';
import PageHeader from '@/layouts/_common/PageHeader';
import {
  buildCourseListPath,
  buildCoursePath,
  parseCourseListRouteQuery,
} from '@/utils/navigation/appRoute';

import PublicListPagination from '../_components/PublicListPagination';
import { CreateCourseModal, JoinCourseModal } from '../_components/PublicModals';
import PublicSectionTabs from '../_components/PublicSectionTabs';
import styles from '../style.module.less';

function PublicCoursesPage() {
  const { t } = useTranslation(['course', 'group']);
  const courseService = useCourseService();
  const userService = useUserService();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const query = parseCourseListRouteQuery(searchParams);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const userRequest = useApi(() => userService.getUserInfo());
  const courseRequest = useApi(
    () => courseService.listMyCourses({ page: query.page, size: query.size }),
    {
      refreshDeps: [query.page, query.size],
      loadingDelay: 160,
      getErrorMessage: () => t('group:list.loadFailed'),
    }
  );
  const identityType = userRequest.data?.identityType;
  const canCreateCourse = identityType === IDENTITY.TEACHER || identityType === IDENTITY.ADMIN;
  const canJoinCourse = identityType === IDENTITY.STUDENT || identityType === IDENTITY.ADMIN;
  const courses = courseRequest.data?.list ?? [];
  const total = courseRequest.data?.total ?? 0;
  const waitingForInitialData =
    courseRequest.data === undefined && !courseRequest.error && !courseRequest.loading;
  const canonicalPath = buildCourseListPath(query);
  const totalPages = Math.max(Math.ceil(total / query.size), 1);
  const boundedPath =
    courseRequest.data && query.page > totalPages
      ? buildCourseListPath({ ...query, page: totalPages })
      : undefined;

  const navigateWithQuery = (next: Partial<typeof query>) => {
    navigate(buildCourseListPath({ ...query, ...next }));
  };

  if (`${location.pathname}${location.search}` !== canonicalPath) {
    return <Navigate to={canonicalPath} replace />;
  }
  if (boundedPath) return <Navigate to={boundedPath} replace />;

  return (
    <>
      <PageHeader
        title={t('list.title')}
        subtitle={t('list.subtitle')}
        actions={
          canCreateCourse || canJoinCourse ? (
            <div className={styles.actionsRow}>
              {canCreateCourse ? (
                <AppButton
                  variant={canJoinCourse ? 'secondary' : 'primary'}
                  onPress={() => setCreateModalOpen(true)}
                >
                  <Plus size={16} aria-hidden />
                  {t('list.create')}
                </AppButton>
              ) : null}
              {canJoinCourse ? (
                <AppButton variant="primary" onPress={() => setJoinModalOpen(true)}>
                  <UserPlus size={16} aria-hidden />
                  {t('list.join')}
                </AppButton>
              ) : null}
            </div>
          ) : null
        }
      />

      <div className={styles.listControls}>
        <PublicSectionTabs selectedKey="courses" />
      </div>

      {waitingForInitialData ? (
        <div className={styles.loading} aria-hidden />
      ) : courseRequest.loading ? (
        <div className={styles.loading} role="status" aria-label={t('group:list.loading')}>
          <Spin size="large" />
        </div>
      ) : courses.length > 0 ? (
        <div className={styles.grid}>
          {courses.map((course) => (
            <div key={course.courseId} className={styles.gridItem}>
              <CourseCard
                course={course}
                onClick={() => navigate(buildCoursePath(course.courseId, 'home'))}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Empty description={t('list.empty')} />
        </div>
      )}

      <PublicListPagination
        page={query.page}
        size={query.size}
        total={total}
        onChange={(page, size) => navigateWithQuery({ page, size })}
      />
      <JoinCourseModal
        isOpen={joinModalOpen}
        onOpenChange={setJoinModalOpen}
        onJoined={() => void courseRequest.refresh()}
      />
      <CreateCourseModal
        isOpen={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreated={(courseId) => navigate(buildCoursePath(courseId, 'home'))}
      />
    </>
  );
}

export default PublicCoursesPage;
