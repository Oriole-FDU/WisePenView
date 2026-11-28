import type { CourseMeeting } from '@/domains/Course';

import type { CourseEditorForm, UpdateCourseEditorForm } from '../../_common/model';

export interface CourseScheduleSectionProps {
  form: CourseEditorForm;
  onUpdate: UpdateCourseEditorForm;
  onUpdateMeeting: (meetingId: string, patch: Partial<CourseMeeting>) => void;
}
