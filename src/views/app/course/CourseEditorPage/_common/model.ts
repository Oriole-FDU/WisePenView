import {
  COURSE_FINAL_ASSESSMENT_TYPE,
  COURSE_WEEK_PATTERN,
  type CourseAssessmentItem,
  type CourseFinalAssessment,
  type CourseMeeting,
  type CourseWeekPattern,
} from '@/domains/Course';
import { createUuid } from '@/utils/random/createUuid';

export interface CourseAssessmentEditorItem extends CourseAssessmentItem {
  editorId: string;
}

export interface CourseEditorForm {
  name: string;
  description: string;
  coverUrl: string;
  term: string;
  category: string;
  startAt: string;
  endAt: string;
  learningObjectives: string;
  meetings: CourseMeeting[];
  assessmentItems: CourseAssessmentEditorItem[];
  finalAssessment: CourseFinalAssessment;
  finalAssessmentDeadlineTime: string;
}

export type UpdateCourseEditorForm = <K extends keyof CourseEditorForm>(
  key: K,
  value: CourseEditorForm[K]
) => void;

export const COURSE_WEEK_PATTERNS: CourseWeekPattern[] = Object.values(COURSE_WEEK_PATTERN);
export const COURSE_WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
export const COURSE_ASSESSMENT_TYPES: CourseFinalAssessment['type'][] = Object.values(
  COURSE_FINAL_ASSESSMENT_TYPE
);
export const createCourseMeeting = (): CourseMeeting => ({
  meetingId: createUuid(),
  weekPattern: COURSE_WEEK_PATTERN.EVERY,
  weekday: '周一',
  startPeriod: 1,
  endPeriod: 2,
  location: '',
});

export const createAssessmentEditorItem = (
  item: CourseAssessmentItem
): CourseAssessmentEditorItem => ({
  ...item,
  editorId: createUuid(),
});

export const getCourseAssessmentTotal = (items: CourseAssessmentEditorItem[]) =>
  items.reduce(
    (sum, item) => sum + (Number.isFinite(item.weight) ? Math.max(0, item.weight) : 0),
    0
  );
