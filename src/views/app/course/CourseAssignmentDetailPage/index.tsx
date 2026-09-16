import { toast } from '@heroui/react';
import { ArrowLeft, CalendarClock, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { Spin } from '@/components/base/Feedback';
import UploadZone from '@/components/base/Input/UploadZone';
import { useCourseService } from '@/domains';
import { COURSE_ASSIGNMENT_STATUS } from '@/domains/Course';
import { useApi } from '@/hooks/useApi';
import { useCourseContext } from '@/layouts/Course/CourseContext';
import { parseErrorMessage } from '@/utils/error';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import { buildCourseAssignmentPath } from '@/utils/navigation/appRoute';

import styles from './style.module.less';

function CourseAssignmentDetailPage() {
  const { t } = useTranslation('course');
  const { course, refreshCourse } = useCourseContext();
  const courseService = useCourseService();
  const navigate = useNavigate();
  const { assignmentId = '' } = useParams<{ assignmentId: string }>();
  const [files, setFiles] = useState<File[]>([]);
  const { data, loading, error, refresh } = useApi(
    () => courseService.getCourseAssignment(course.courseId, assignmentId),
    { ready: Boolean(assignmentId), refreshDeps: [assignmentId, course.courseId] }
  );
  const { loading: submitting, run: submitAssignment } = useApi(
    () =>
      courseService.submitCourseAssignment({
        courseId: course.courseId,
        assignmentId,
        fileNames: files.map((file) => file.name),
      }),
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('assignments.success'));
        setFiles([]);
        refresh();
        refreshCourse();
      },
    }
  );

  const handleSubmit = () => {
    if (files.length === 0) {
      toast.warning(t('assignments.fileRequired'));
      return;
    }
    submitAssignment();
  };

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

  const submitted = data.status !== COURSE_ASSIGNMENT_STATUS.PENDING;
  const deadline = formatTimestampToDateTime(data.deadline);

  return (
    <div className={styles.page}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => navigate(buildCourseAssignmentPath(course.courseId))}
      >
        <ArrowLeft size={16} aria-hidden />
        {t('assignments.title')}
      </button>
      <header className={styles.header}>
        <div>
          {data.scopeLabel ? <span className={styles.scope}>{data.scopeLabel}</span> : null}
          <h1>{data.title}</h1>
          <p>
            <CalendarClock size={16} aria-hidden />
            {t('assignments.deadline', { date: deadline })}
          </p>
        </div>
        <span className={styles.status} data-submitted={submitted || undefined}>
          {submitted ? <CheckCircle2 size={16} aria-hidden /> : null}
          {t(`assignments.${data.status.toLowerCase()}`)}
        </span>
      </header>

      <section className={styles.section}>
        <h2>{t('assignments.requirements')}</h2>
        <p>{data.description}</p>
      </section>

      <section className={styles.section}>
        <h2>{t('assignments.submission')}</h2>
        {data.submittedFileNames.length > 0 ? (
          <div className={styles.submittedFiles}>
            {data.submittedFileNames.map((fileName) => (
              <span key={fileName}>{fileName}</span>
            ))}
          </div>
        ) : null}
        <UploadZone
          files={files}
          multiple
          disabled={submitting}
          label={t('assignments.chooseFile')}
          description={t('assignments.fileHint')}
          onFilesChange={setFiles}
        />
        <div className={styles.submitActions}>
          <AppButton variant="primary" isDisabled={submitting} onPress={handleSubmit}>
            {t('assignments.submit')}
          </AppButton>
        </div>
      </section>
    </div>
  );
}

export default CourseAssignmentDetailPage;
