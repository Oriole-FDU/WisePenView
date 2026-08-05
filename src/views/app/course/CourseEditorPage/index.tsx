import AppIconButton from '@/components/Button/AppIconButton';
import { COURSE_ROLE } from '@/domains/Course';
import { useCourseContext } from '@/layouts/Course/CourseContext';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import CourseAssessmentSection from './_components/CourseAssessmentSection';
import CourseBasicSection from './_components/CourseBasicSection';
import CourseCoverModal from './_components/CourseCoverModal';
import CourseDangerSection from './_components/CourseDangerSection';
import CourseEditorNav from './_components/CourseEditorNav';
import CourseGoalsSection from './_components/CourseGoalsSection';
import CoursePermissionSection from './_components/CoursePermissionSection';
import CourseScheduleSection from './_components/CourseScheduleSection';
import { useCourseEditorFormController } from './controllers/useCourseEditorFormController';
import { useCourseEditorNavigationController } from './controllers/useCourseEditorNavigationController';
import styles from './style.module.less';

function CourseEditorPage() {
  const { t } = useTranslation('course');
  const { course, refreshCourse } = useCourseContext();
  const navigate = useNavigate();
  const editor = useCourseEditorFormController({ course, refreshCourse });
  const { activeSection, setEditorScrollElement, navigateToSection, handleEditorScroll } =
    useCourseEditorNavigationController();

  if (course.myRole !== COURSE_ROLE.TEACHER) {
    return <Navigate to={`/app/course/${course.courseId}/home`} replace />;
  }

  return (
    <div className={styles.editorShell}>
      <header className={styles.editorHeader}>
        <AppIconButton
          icon={<ArrowLeft aria-hidden />}
          label={t('editor.back')}
          onPress={() => navigate(`/app/course/${course.courseId}/home`)}
        />
        <div>
          <strong>{course.name}</strong>
          <span>{t('editor.title')}</span>
        </div>
      </header>

      <div className={styles.editorBody}>
        <CourseEditorNav activeSection={activeSection} onNavigate={navigateToSection} />

        <main
          ref={setEditorScrollElement}
          className={styles.editorScroll}
          onScroll={handleEditorScroll}
        >
          <div className={styles.editorContent}>
            <CourseBasicSection
              form={editor.form}
              saved={editor.saved}
              saving={editor.saving}
              coverUrl={editor.cover.displayUrl}
              onUpdate={editor.updateForm}
              onSave={editor.handleSave}
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
              noFinalAssessmentValue={editor.noFinalAssessmentValue}
              hasNoFinalAssessment={editor.hasNoFinalAssessment}
              onUpdate={editor.updateForm}
              onUpdateAssessment={editor.updateAssessment}
              onUpdateDeadlineDate={editor.updateDeadlineDate}
              onUpdateDeadlineTime={editor.updateDeadlineTime}
            />

            <section id="course-editor-access" className={styles.editorSection}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>{t('editor.permissions.title')}</h2>
                  <p>{t('editor.permissions.description')}</p>
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
    </div>
  );
}

export default CourseEditorPage;
