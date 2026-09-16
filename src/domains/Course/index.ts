export { createDefaultCourseAssessmentItems } from './constants/defaults';
export {
  calculateCourseTeachingWeek,
  calculateCourseTotalTeachingWeeks,
  formatCoursePeriodRange,
  FUDAN_COURSE_PERIODS,
  getCoursePeriodTimeRange,
  isCoursePeriod,
} from './constants/schedule';
export type * from './entity/course';
export {
  COURSE_ASSIGNMENT_STATUS,
  COURSE_FINAL_ASSESSMENT_TYPE,
  COURSE_ROLE,
  COURSE_WEEK_PATTERN,
  type CourseAssignmentStatus,
  type CourseFinalAssessmentType,
  type CourseRole,
  type CourseWeekPattern,
  isCourseFinalAssessmentType,
  isCourseWeekPattern,
} from './enum';
export type * from './service/index.type';
