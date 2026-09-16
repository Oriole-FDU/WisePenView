import { ListBox } from '@heroui/react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import AppIconButton from '@/components/base/Button/AppIconButton';
import { PieChart } from '@/components/base/Chart';
import { FormField, Input, Select } from '@/components/base/Input';
import type { CourseAssessmentItem, CourseFinalAssessment } from '@/domains/Course';

import {
  COURSE_ASSESSMENT_TYPES,
  type CourseEditorForm,
  createAssessmentEditorItem,
  type UpdateCourseEditorForm,
} from '../../model';
import styles from '../../style.module.less';
import { CourseDateField, CourseTimeField } from '../CourseEditorDateFields';

interface CourseAssessmentSectionProps {
  form: CourseEditorForm;
  assessmentTotal: number;
  noFinalAssessmentValue: string;
  hasNoFinalAssessment: boolean;
  onUpdate: UpdateCourseEditorForm;
  onUpdateAssessment: (editorId: string, patch: Partial<CourseAssessmentItem>) => void;
  onUpdateDeadlineDate: (value: string) => void;
  onUpdateDeadlineTime: (value: string) => void;
}

function CourseAssessmentSection({
  form,
  assessmentTotal,
  noFinalAssessmentValue,
  hasNoFinalAssessment,
  onUpdate,
  onUpdateAssessment,
  onUpdateDeadlineDate,
  onUpdateDeadlineTime,
}: CourseAssessmentSectionProps) {
  const { t } = useTranslation('course');

  return (
    <section id="course-editor-assessment" className={styles.editorSection}>
      <div className={styles.sectionHead}>
        <div>
          <h2>{t('editor.assessment.title')}</h2>
          <p>{t('editor.assessment.description')}</p>
        </div>
      </div>
      <div className={styles.assessmentWorkbench}>
        <div className={styles.assessmentEditor}>
          <div className={styles.assessmentColumns}>
            <span>{t('editor.fields.assessmentName')}</span>
            <span>{t('editor.fields.weight')}</span>
          </div>
          <div className={styles.assessmentList}>
            {form.assessmentItems.map((item) => (
              <div key={item.editorId} className={styles.assessmentRow}>
                <Input
                  value={item.label}
                  aria-label={t('editor.fields.assessmentName')}
                  onChange={(event) =>
                    onUpdateAssessment(item.editorId, { label: event.target.value })
                  }
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={String(item.weight)}
                  aria-label={t('editor.fields.weight')}
                  onChange={(event) =>
                    onUpdateAssessment(item.editorId, { weight: Number(event.target.value) })
                  }
                />
                <AppIconButton
                  icon={<Trash2 aria-hidden />}
                  label={t('editor.actions.deleteAssessment')}
                  variant="danger"
                  onPress={() =>
                    onUpdate(
                      'assessmentItems',
                      form.assessmentItems.filter(
                        (assessment) => assessment.editorId !== item.editorId
                      )
                    )
                  }
                />
              </div>
            ))}
          </div>
          <AppButton
            variant="secondary"
            onPress={() =>
              onUpdate('assessmentItems', [
                ...form.assessmentItems,
                createAssessmentEditorItem({ label: '', weight: 0 }),
              ])
            }
          >
            <Plus size={16} aria-hidden />
            {t('editor.actions.addAssessment')}
          </AppButton>
        </div>
        <PieChart
          items={form.assessmentItems.map((item) => ({
            id: item.editorId,
            label: item.label.trim() || t('editor.assessment.unnamed'),
            value: item.weight,
          }))}
          targetValue={100}
          title={t('editor.assessment.chartTitle')}
          description={t('editor.assessment.chartDescription')}
          unallocatedLabel={t('editor.assessment.unallocated')}
          emptyLabel={t('editor.assessment.unallocated')}
          valueFormatter={(value) => `${value}%`}
          ariaLabel={t('editor.assessment.chartAria', { total: assessmentTotal })}
        />
      </div>
      <div className={styles.finalAssessment}>
        <div className={styles.subsectionHead}>
          <div>
            <h3>{t('editor.assessment.final')}</h3>
            <p>{t('editor.assessment.finalDescription')}</p>
          </div>
        </div>
        <Select
          className={styles.finalTypeField}
          label={t('editor.fields.finalType')}
          variant="primary"
          value={form.finalAssessment.type}
          onChange={(value) => {
            if (typeof value !== 'string') return;
            onUpdate('finalAssessment', { type: value as CourseFinalAssessment['type'] });
          }}
          aria-label={t('editor.fields.finalType')}
        >
          <Select.Trigger className={styles.finalTypeTrigger}>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {COURSE_ASSESSMENT_TYPES.map((item) => (
                <ListBox.Item key={item} id={item}>
                  {t(`editor.finalType.${item}`)}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        {form.finalAssessment.type === 'EXAM' ? (
          <div className={styles.finalExamFields}>
            <FormField
              label={t('editor.fields.examForm')}
              value={form.finalAssessment.examForm ?? ''}
              onChange={(value) =>
                onUpdate('finalAssessment', { ...form.finalAssessment, examForm: value })
              }
            >
              <Input placeholder={t('editor.fields.examFormPlaceholder')} />
            </FormField>
            <FormField
              label={t('editor.fields.examLocation')}
              value={form.finalAssessment.location ?? ''}
              onChange={(value) =>
                onUpdate('finalAssessment', { ...form.finalAssessment, location: value })
              }
            >
              <Input />
            </FormField>
            <CourseDateField
              label={t('editor.fields.examDate')}
              value={form.finalAssessment.date ?? ''}
              onChange={(value) =>
                onUpdate('finalAssessment', { ...form.finalAssessment, date: value })
              }
            />
            <div className={styles.finalTimeFields}>
              <CourseTimeField
                label={t('editor.fields.startTime')}
                value={form.finalAssessment.startTime ?? ''}
                onChange={(value) =>
                  onUpdate('finalAssessment', { ...form.finalAssessment, startTime: value })
                }
              />
              <CourseTimeField
                label={t('editor.fields.endTime')}
                value={form.finalAssessment.endTime ?? ''}
                onChange={(value) =>
                  onUpdate('finalAssessment', { ...form.finalAssessment, endTime: value })
                }
              />
            </div>
          </div>
        ) : (
          <div className={styles.finalDeadlineFields}>
            {form.finalAssessment.type === 'OTHER' ? (
              <FormField
                label={t('editor.fields.customAssessment')}
                className={styles.finalCustomName}
                value={form.finalAssessment.customName ?? ''}
                onChange={(value) =>
                  onUpdate('finalAssessment', {
                    ...form.finalAssessment,
                    customName: value,
                    deadline:
                      value.trim() === noFinalAssessmentValue
                        ? undefined
                        : form.finalAssessment.deadline,
                  })
                }
              >
                <Input placeholder={t('editor.fields.customAssessmentPlaceholder')} />
              </FormField>
            ) : null}
            {!hasNoFinalAssessment ? (
              <>
                <CourseDateField
                  label={t('editor.fields.deadlineDate')}
                  value={form.finalAssessment.deadline?.split('T')[0] ?? ''}
                  onChange={onUpdateDeadlineDate}
                />
                <CourseTimeField
                  label={t('editor.fields.deadlineTime')}
                  value={form.finalAssessmentDeadlineTime}
                  onChange={onUpdateDeadlineTime}
                />
              </>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

export default CourseAssessmentSection;
