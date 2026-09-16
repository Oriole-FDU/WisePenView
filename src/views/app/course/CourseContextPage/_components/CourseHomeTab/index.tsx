import { Meter, ProgressBar } from '@heroui/react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { Spin } from '@/components/base/Feedback';
import { useCourseService } from '@/domains';
import { COURSE_ROLE } from '@/domains/Course';
import { useApi } from '@/hooks/useApi';
import { useCourseContext } from '@/layouts/Course/CourseContext';
import { parseErrorMessage } from '@/utils/error';
import { buildCourseLearningPath } from '@/utils/navigation/appRoute';

import styles from './style.module.less';

function CourseHomeTab() {
  const { t } = useTranslation('course');
  const { course } = useCourseContext();
  const courseService = useCourseService();
  const navigate = useNavigate();
  const canEditOutline = course.myRole === COURSE_ROLE.TEACHER;
  const { data, loading, error, refresh } = useApi(() =>
    courseService.getCourseHome(course.courseId)
  );

  if (loading) {
    return (
      <div className={styles.state}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.state}>
        <span>{error ? parseErrorMessage(error) : t('common.notFound')}</span>
        <AppButton variant="secondary" onPress={refresh}>
          {t('common.retry')}
        </AppButton>
      </div>
    );
  }

  return (
    <div className={styles.homeLayout}>
      <div className={styles.leftScroll}>
        <section className={styles.homeSection}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionIcon}>
              <BookOpen size={18} aria-hidden />
            </span>
            <div>
              <h2>{t('home.learning')}</h2>
              <p>
                {t('home.readProgress', {
                  read: data.progress.readResourceCount,
                  total: data.progress.totalResourceCount,
                })}
              </p>
            </div>
          </div>
          <AppButton
            variant="primary"
            onPress={() => navigate(buildCourseLearningPath(course.courseId))}
          >
            {canEditOutline ? t('home.enterEditing') : t('home.enterLearning')}
            <ArrowRight size={16} aria-hidden />
          </AppButton>
        </section>
      </div>

      <aside className={styles.progressAside}>
        <div className={styles.progressMetrics}>
          <h2>{t('home.courseProgress')}</h2>
          <div className={styles.metric}>
            <Meter
              aria-label={t('home.courseProgress')}
              value={data.progress.percent}
              valueLabel={`${data.progress.percent}%`}
              className={styles.progressMeter}
            >
              <Meter.Output className={styles.metricValue} />
            </Meter>
            <ProgressBar
              aria-label={t('home.courseProgress')}
              value={data.progress.percent}
              className={styles.progressBar}
            >
              <ProgressBar.Track className={styles.progressTrack}>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>{t('home.completedContent')}</span>
            <div className={styles.metricValue}>
              {data.progress.readResourceCount} <small>/ {data.progress.totalResourceCount}</small>
            </div>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>{t('home.pendingAssignments')}</span>
            <div className={styles.metricValue}>{data.pendingAssignments.length}</div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default CourseHomeTab;
