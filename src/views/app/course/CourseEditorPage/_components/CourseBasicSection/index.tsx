import { Tooltip } from '@heroui/react';
import { Pencil, Save } from 'lucide-react';
import type { SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import { FormField, Input, TextArea } from '@/components/base/Input';
import { TOOLTIP_FOCUS_PASSTHROUGH_PROPS } from '@/layouts/_common/a11y/tooltipFocusPassthrough';

import type { CourseEditorForm, UpdateCourseEditorForm } from '../../model';
import styles from '../../style.module.less';

interface CourseBasicSectionProps {
  form: CourseEditorForm;
  saved: boolean;
  saving: boolean;
  coverUrl: string;
  onUpdate: UpdateCourseEditorForm;
  onSave: () => void;
  onChangeCover: () => void;
  onCoverImageError: (event: SyntheticEvent<HTMLImageElement>) => void;
}

function CourseBasicSection({
  form,
  saved,
  saving,
  coverUrl,
  onUpdate,
  onSave,
  onChangeCover,
  onCoverImageError,
}: CourseBasicSectionProps) {
  const { t } = useTranslation('course');

  return (
    <section id="course-editor-basic" className={styles.editorSection}>
      <div className={styles.sectionHead}>
        <div>
          <h2>{t('editor.basic.title')}</h2>
          <p>{t('editor.basic.description')}</p>
        </div>
        <div className={styles.saveActions}>
          <span className={saved ? styles.saved : styles.unsaved}>
            {saved ? t('editor.saved') : t('editor.unsaved')}
          </span>
          <AppButton variant="primary" isDisabled={saving || saved} onPress={onSave}>
            <Save size={16} aria-hidden />
            {t('editor.save')}
          </AppButton>
        </div>
      </div>
      <div className={styles.basicLayout}>
        <div className={styles.basicFields}>
          <FormField
            label={t('editor.fields.name')}
            value={form.name}
            onChange={(value) => onUpdate('name', value)}
          >
            <Input />
          </FormField>
          <FormField
            label={t('editor.fields.term')}
            value={form.term}
            onChange={(value) => onUpdate('term', value)}
          >
            <Input placeholder="2026-2027 春季" />
          </FormField>
          <FormField
            label={t('editor.fields.category')}
            value={form.category}
            onChange={(value) => onUpdate('category', value)}
          >
            <Input placeholder={t('editor.fields.categoryPlaceholder')} />
          </FormField>
        </div>
        <div className={styles.coverField}>
          <span className={styles.coverLabel}>{t('editor.fields.cover')}</span>
          <Tooltip>
            <Tooltip.Trigger {...TOOLTIP_FOCUS_PASSTHROUGH_PROPS}>
              <button
                type="button"
                className={styles.coverButton}
                aria-label={t('editor.actions.changeCover')}
                onClick={onChangeCover}
              >
                <img
                  src={coverUrl}
                  alt={t('editor.fields.coverAlt', { name: form.name })}
                  onError={onCoverImageError}
                />
                <span>
                  <Pencil size={16} aria-hidden />
                </span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>{t('editor.actions.changeCover')}</Tooltip.Content>
          </Tooltip>
        </div>
      </div>
      <FormField
        label={t('editor.fields.description')}
        className={styles.descriptionField}
        value={form.description}
        onChange={(value) => onUpdate('description', value)}
      >
        <TextArea className={styles.courseTextArea} rows={3} />
      </FormField>
    </section>
  );
}

export default CourseBasicSection;
