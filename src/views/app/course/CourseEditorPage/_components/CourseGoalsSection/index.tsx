import { useTranslation } from 'react-i18next';

import { FormField, TextArea } from '@/components/base/Input';

import type { UpdateCourseEditorForm } from '../../model';
import styles from '../../style.module.less';

interface CourseGoalsSectionProps {
  value: string;
  onUpdate: UpdateCourseEditorForm;
}

function CourseGoalsSection({ value, onUpdate }: CourseGoalsSectionProps) {
  const { t } = useTranslation('course');

  return (
    <section id="course-editor-goals" className={styles.editorSection}>
      <div className={styles.sectionHead}>
        <div>
          <h2>{t('editor.goals.title')}</h2>
          <p>{t('editor.goals.description')}</p>
        </div>
      </div>
      <FormField
        label={t('editor.fields.goals')}
        value={value}
        onChange={(nextValue) => onUpdate('learningObjectives', nextValue)}
      >
        <TextArea
          className={styles.courseTextArea}
          rows={3}
          placeholder={t('editor.fields.goalsPlaceholder')}
        />
      </FormField>
    </section>
  );
}

export default CourseGoalsSection;
