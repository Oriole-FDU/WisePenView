import { Spin } from '@/components/Feedback';
import { useCourseService } from '@/domains';
import { COURSE_ASSIGNMENT_STATUS } from '@/domains/Course';
import { useCourseContext } from '@/layouts/Course/CourseContext';
import { parseErrorMessage } from '@/utils/error';
import { Button } from '@heroui/react';
import { useRequest } from 'ahooks';
import { CalendarClock, CheckCircle2, ChevronRight, ClipboardCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styles from './style.module.less';

function CourseAssignmentsPage() {
  const { t, i18n } = useTranslation('course');
  const { course } = useCourseContext();
  const courseService = useCourseService();
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useRequest(() =>
    courseService.listCourseAssignments(course.courseId)
  );

  const formatDeadline = (deadline: string) =>
    new Date(deadline).toLocaleString(i18n.language, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{t('assignments.title')}</h1>
        <p>{t('assignments.description')}</p>
      </header>

      {loading ? (
        <div className={styles.state}>
          <Spin size="large" />
        </div>
      ) : null}
      {error ? (
        <div className={styles.state}>
          <span>{parseErrorMessage(error)}</span>
          <Button variant="secondary" onPress={refresh}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}
      {!loading && !error && data?.length === 0 ? (
        <div className={styles.state}>{t('assignments.empty')}</div>
      ) : null}

      {data?.length ? (
        <div className={styles.assignmentList}>
          {data.map((assignment) => {
            const pending = assignment.status === COURSE_ASSIGNMENT_STATUS.PENDING;
            return (
              <button
                key={assignment.assignmentId}
                type="button"
                className={styles.assignmentRow}
                onClick={() =>
                  navigate(`/app/course/${course.courseId}/assignments/${assignment.assignmentId}`)
                }
              >
                <span className={styles.assignmentIcon} data-pending={pending || undefined}>
                  {pending ? (
                    <ClipboardCheck size={20} aria-hidden />
                  ) : (
                    <CheckCircle2 size={20} aria-hidden />
                  )}
                </span>
                <span className={styles.assignmentMain}>
                  <strong>{assignment.title}</strong>
                  {assignment.scopeLabel ? <small>{assignment.scopeLabel}</small> : null}
                </span>
                <span className={styles.deadline}>
                  <CalendarClock size={15} aria-hidden />
                  {t('assignments.deadline', { date: formatDeadline(assignment.deadline) })}
                </span>
                <span className={styles.status} data-pending={pending || undefined}>
                  {t(`assignments.${assignment.status.toLowerCase()}`)}
                </span>
                <ChevronRight size={17} className={styles.chevron} aria-hidden />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default CourseAssignmentsPage;
