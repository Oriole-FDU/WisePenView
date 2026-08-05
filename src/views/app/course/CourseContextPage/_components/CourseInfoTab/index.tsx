import { PieChart } from '@/components/Chart';
import { formatCoursePeriodRange, getCoursePeriodTimeRange } from '@/domains/Course';
import { useCourseContext } from '@/layouts/Course/CourseContext';
import {
  CalendarRange,
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  Clock3,
  Target,
  UserRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './style.module.less';

function CourseInfoTab() {
  const { t, i18n } = useTranslation('course');
  const { course } = useCourseContext();
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  const coursePeriod =
    course.startAt && course.endAt
      ? `${formatDate(course.startAt)} - ${formatDate(course.endAt)}`
      : t('info.notSet');
  const totalTeachingWeeks =
    course.totalTeachingWeeks === undefined
      ? undefined
      : t('info.totalWeeks', { count: course.totalTeachingWeeks });
  const finalAssessment = course.finalAssessment;
  const finalAssessmentTitle = finalAssessment
    ? finalAssessment.type === 'OTHER'
      ? finalAssessment.customName || t('info.finalAssessment')
      : t(`editor.finalType.${finalAssessment.type}`)
    : t('info.notSet');
  const finalAssessmentDetail = finalAssessment
    ? finalAssessment.type === 'EXAM'
      ? [
          finalAssessment.date,
          finalAssessment.startTime && finalAssessment.endTime
            ? `${finalAssessment.startTime} - ${finalAssessment.endTime}`
            : undefined,
          finalAssessment.location,
        ]
          .filter(Boolean)
          .join(' · ')
      : finalAssessment.deadline
    : undefined;
  const assessmentTotal = course.assessmentItems.reduce(
    (sum, item) => sum + (Number.isFinite(item.weight) ? Math.max(0, item.weight) : 0),
    0
  );

  return (
    <div className={styles.infoPage}>
      <div className={styles.infoMain}>
        <section className={styles.infoSection}>
          <header className={styles.infoSectionHeader}>
            <Target size={19} aria-hidden />
            <div>
              <h2>{t('info.goals')}</h2>
              <p>{t('info.goalsDescription')}</p>
            </div>
          </header>
          {course.learningObjectives.length > 0 ? (
            <ol className={styles.goalList}>
              {course.learningObjectives.map((objective, index) => (
                <li key={objective}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{objective}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.infoEmpty}>{t('info.notSet')}</p>
          )}
        </section>

        <section className={styles.infoSection}>
          {course.assessmentItems.length > 0 ? (
            <PieChart
              variant="section"
              icon={<ChartNoAxesColumnIncreasing size={19} aria-hidden />}
              items={course.assessmentItems.map((item, index) => ({
                id: `assessment-${index}`,
                label: item.label,
                value: item.weight,
              }))}
              targetValue={100}
              title={t('info.assessment')}
              description={t('info.assessmentDescription')}
              unallocatedLabel={t('editor.assessment.unallocated')}
              emptyLabel={t('info.notSet')}
              valueFormatter={(value) => `${value}%`}
              ariaLabel={t('editor.assessment.chartAria', { total: assessmentTotal })}
            />
          ) : (
            <div>
              <header className={styles.infoSectionHeader}>
                <div>
                  <h2>{t('info.assessment')}</h2>
                  <p>{t('info.assessmentDescription')}</p>
                </div>
              </header>
              <p className={styles.infoEmpty}>{t('info.notSet')}</p>
            </div>
          )}
        </section>
      </div>

      <aside className={styles.teachingAside}>
        <h2>{t('info.teachingDetails')}</h2>
        <div className={styles.teachingList}>
          <div className={styles.teachingItem}>
            <CalendarRange size={18} aria-hidden />
            <span>
              <small>{t('info.period')}</small>
              <strong>{coursePeriod}</strong>
              {totalTeachingWeeks ? <small>{totalTeachingWeeks}</small> : null}
            </span>
          </div>
          <div className={styles.teachingItem}>
            <Clock3 size={18} aria-hidden />
            <span>
              <small>{t('info.schedule')}</small>
              {course.meetings.length > 0 ? (
                course.meetings.map((meeting) => (
                  <span key={meeting.meetingId} className={styles.meetingDetail}>
                    <strong>
                      {t(`editor.weekPattern.${meeting.weekPattern}`)} {meeting.weekday}{' '}
                      {formatCoursePeriodRange(meeting.startPeriod, meeting.endPeriod)}
                    </strong>
                    <small>
                      {getCoursePeriodTimeRange(meeting.startPeriod, meeting.endPeriod)}
                      {meeting.location ? ` · ${meeting.location}` : ''}
                    </small>
                  </span>
                ))
              ) : (
                <strong>{t('info.notSet')}</strong>
              )}
            </span>
          </div>
          <div className={styles.teachingItem}>
            <ClipboardList size={18} aria-hidden />
            <span>
              <small>{t('info.finalAssessment')}</small>
              <strong>
                {finalAssessmentTitle}
                {finalAssessment?.examForm ? ` · ${finalAssessment.examForm}` : ''}
              </strong>
              {finalAssessmentDetail ? <small>{finalAssessmentDetail}</small> : null}
            </span>
          </div>
          <div className={styles.teachingItem}>
            <UserRound size={18} aria-hidden />
            <span>
              <small>{t('info.teacher')}</small>
              <strong>{course.teacher.name}</strong>
              {course.teacher.department ? <small>{course.teacher.department}</small> : null}
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default CourseInfoTab;
