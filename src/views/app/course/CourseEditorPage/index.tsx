import { ArrowLeft } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import AppForm from '@/components/base/AppForm';
import AppIconButton from '@/components/base/Button/AppIconButton';
import UnsavedChangesDialog from '@/components/business/UnsavedChangesDialog';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useCourseContext } from '@/layouts/Course/_context';
import { buildCoursePath } from '@/utils/navigation/appRoute';
import { buildChatSessionLocation, getChatSessionId } from '@/utils/navigation/chatRoute';

import CourseAssessmentSection from './_components/CourseAssessmentSection';
import CourseBasicSection from './_components/CourseBasicSection';
import CourseCoverModal from './_components/CourseCoverModal';
import CourseDangerSection from './_components/CourseDangerSection';
import CourseGoalsSection from './_components/CourseGoalsSection';
import CoursePermissionSection from './_components/CoursePermissionSection';
import CourseScheduleSection from './_components/CourseScheduleSection';
import { useCourseEditorFormController } from './controllers/useCourseEditorFormController';
import styles from './style.module.scss';

function CourseEditorPage() {
  const { t } = useTranslation('course');
  const { course, refreshCourse } = useCourseContext();
  const navigate = useNavigate();
  const location = useLocation();
  const editorScrollRef = useRef<HTMLElement | null>(null);
  const editor = useCourseEditorFormController({ course, refreshCourse });
  const leaveGuard = useUnsavedChangesGuard(!editor.saved);
  const navGroups = [
    {
      title: t('editor.groups.info'),
      items: [
        { id: 'course-editor-basic', label: t('editor.nav.basic') },
        { id: 'course-editor-goals', label: t('editor.nav.goals') },
        { id: 'course-editor-schedule', label: t('editor.nav.schedule') },
        { id: 'course-editor-assessment', label: t('editor.nav.assessment') },
      ],
    },
    {
      title: t('editor.groups.management'),
      items: [{ id: 'course-editor-access', label: t('editor.nav.access') }],
    },
  ];

  const handleSaveAndLeave = async () => {
    const savedSuccessfully = await editor.saveCourseRequest();
    if (savedSuccessfully) {
      leaveGuard.proceed();
      return;
    }
    leaveGuard.reset();
  };

  return (
    <div className={styles.editorShell}>
      <header className={styles.editorHeader}>
        <AppIconButton
          icon={<ArrowLeft aria-hidden />}
          label={t('editor.back')}
          onPress={() =>
            navigate(
              buildChatSessionLocation(
                { pathname: buildCoursePath(course.courseId, 'home') },
                getChatSessionId(location)
              )
            )
          }
        />
        <div>
          <strong>{course.name}</strong>
          <span>{t('editor.title')}</span>
        </div>
      </header>

      <div className={styles.editorBody}>
        <AppForm.AnchorNav
          ariaLabel={t('editor.navigationAria')}
          items={navGroups}
          scrollContainerRef={editorScrollRef}
          scrollOffset={32}
          activationOffset={32}
        />

        <main ref={editorScrollRef} className={styles.editorScroll}>
          <div className={styles.editorContent}>
            <CourseBasicSection
              form={editor.form}
              saved={editor.saved}
              saving={editor.saving}
              coverUrl={editor.cover.displayUrl}
              onUpdate={editor.updateForm}
              onSave={editor.handleSave}
              errors={editor.errors}
              onBlur={editor.blurField}
              onChangeCover={() => editor.cover.handleOpenChange(true)}
              onCoverImageError={editor.cover.handleImageError}
            />
            <CourseGoalsSection
              value={editor.form.learningObjectives}
              onUpdate={editor.updateForm}
            />
            <CourseScheduleSection
              form={editor.form}
              onUpdate={editor.updateForm}
              onUpdateMeeting={editor.updateMeeting}
            />
            <CourseAssessmentSection
              form={editor.form}
              assessmentTotal={editor.assessmentTotal}
              assessmentError={editor.errors.assessmentItems}
              noFinalAssessmentValue={editor.noFinalAssessmentValue}
              hasNoFinalAssessment={editor.hasNoFinalAssessment}
              onUpdate={editor.updateForm}
              onUpdateAssessment={editor.updateAssessment}
              onUpdateDeadlineDate={editor.updateDeadlineDate}
              onUpdateDeadlineTime={editor.updateDeadlineTime}
              onBlurAssessment={editor.blurField}
            />

            <section id="course-editor-access" className={styles.editorSection}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>{t('editor.permissions.title')}</h2>
                </div>
              </div>
              <CoursePermissionSection
                courseId={course.courseId}
                outlineRootTagId={course.outlineRootTagId}
                onSuccess={refreshCourse}
              />
            </section>

            <CourseDangerSection courseId={course.courseId} courseName={course.name} />
          </div>
        </main>
      </div>

      <CourseCoverModal
        isOpen={editor.cover.isOpen}
        file={editor.cover.modalFile}
        onOpenChange={editor.cover.handleOpenChange}
        onFileChange={editor.cover.handleFileChange}
        onConfirm={editor.cover.handleConfirm}
      />
      <UnsavedChangesDialog
        isOpen={leaveGuard.isBlocked}
        isLoading={editor.saving}
        title={t('editor.leave.title')}
        description={t('editor.leave.description')}
        cancelText={t('editor.leave.cancel')}
        discardText={t('editor.leave.discard')}
        confirmText={t('editor.leave.confirm')}
        onCancel={leaveGuard.reset}
        onDiscard={leaveGuard.proceed}
        onConfirm={() => void handleSaveAndLeave()}
      />
    </div>
  );
}

export default CourseEditorPage;
