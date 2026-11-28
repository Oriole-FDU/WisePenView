import type { SyntheticEvent } from 'react';

import type { CourseEditorForm, UpdateCourseEditorForm } from '../../_common/model';

export interface CourseBasicSectionProps {
  form: CourseEditorForm;
  saved: boolean;
  saving: boolean;
  errors: Partial<Record<'name' | 'term', string>>;
  coverUrl: string;
  onUpdate: UpdateCourseEditorForm;
  onSave: () => void;
  onBlur: (field: 'name' | 'term') => void;
  onChangeCover: () => void;
  onCoverImageError: (event: SyntheticEvent<HTMLImageElement>) => void;
}
