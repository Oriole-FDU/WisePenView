import type { CourseAssessmentItem } from '@/domains/Course';

import type { CourseEditorForm, UpdateCourseEditorForm } from '../../_common/model';

export interface CourseAssessmentSectionProps {
  form: CourseEditorForm;
  assessmentTotal: number;
  assessmentError?: string;
  noFinalAssessmentValue: string;
  hasNoFinalAssessment: boolean;
  onUpdate: UpdateCourseEditorForm;
  onUpdateAssessment: (editorId: string, patch: Partial<CourseAssessmentItem>) => void;
  onUpdateDeadlineDate: (value: string) => void;
  onUpdateDeadlineTime: (value: string) => void;
  onBlurAssessment: (field: 'assessmentItems') => void;
}
