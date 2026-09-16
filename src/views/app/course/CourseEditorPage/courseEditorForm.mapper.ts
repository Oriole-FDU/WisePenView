import {
  COURSE_FINAL_ASSESSMENT_TYPE,
  type CourseDetail,
  createDefaultCourseAssessmentItems,
  type UpdateCourseRequest,
} from '@/domains/Course';

import { type CourseEditorForm, createAssessmentEditorItem, createCourseMeeting } from './model';

interface MapCourseEditorFormToUpdateRequestParams {
  courseId: string;
  form: CourseEditorForm;
  coverUrl?: string;
}

export const mapCourseDetailToEditorForm = (course: CourseDetail): CourseEditorForm => ({
  name: course.name,
  description: course.description,
  coverUrl: course.coverUrl ?? '',
  term: course.term,
  category: course.category ?? '',
  startAt: course.startAt?.slice(0, 10) ?? '',
  endAt: course.endAt?.slice(0, 10) ?? '',
  learningObjectives: course.learningObjectives.join('\n'),
  meetings: course.meetings.length > 0 ? course.meetings : [createCourseMeeting()],
  assessmentItems:
    course.assessmentItems.length > 0
      ? course.assessmentItems.map(createAssessmentEditorItem)
      : createDefaultCourseAssessmentItems().map(createAssessmentEditorItem),
  finalAssessment: course.finalAssessment ?? { type: COURSE_FINAL_ASSESSMENT_TYPE.EXAM },
  finalAssessmentDeadlineTime: course.finalAssessment?.deadline?.split('T')[1] ?? '23:59',
});

export const mapCourseEditorFormToUpdateRequest = ({
  courseId,
  form,
  coverUrl,
}: MapCourseEditorFormToUpdateRequestParams): UpdateCourseRequest => ({
  courseId,
  name: form.name.trim(),
  description: form.description.trim(),
  coverUrl: coverUrl?.trim() || undefined,
  term: form.term.trim(),
  category: form.category.trim() || undefined,
  startAt: form.startAt || undefined,
  endAt: form.endAt || undefined,
  learningObjectives: form.learningObjectives
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean),
  meetings: form.meetings,
  assessmentItems: form.assessmentItems.map(({ label, weight }) => ({ label, weight })),
  finalAssessment: form.finalAssessment,
});
