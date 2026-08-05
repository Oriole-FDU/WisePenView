export { createDefaultCourseAssessmentItems } from './constants/defaults';
export {
  FUDAN_COURSE_PERIODS,
  calculateCourseTeachingWeek,
  calculateCourseTotalTeachingWeeks,
  formatCoursePeriodRange,
  getCoursePeriodTimeRange,
  isCoursePeriod,
} from './constants/schedule';
export type * from './entity/course';
export {
  COURSE_ASSIGNMENT_STATUS,
  COURSE_FINAL_ASSESSMENT_TYPE,
  COURSE_ROLE,
  COURSE_WEEK_PATTERN,
  isCourseFinalAssessmentType,
  isCourseWeekPattern,
  type CourseAssignmentStatus,
  type CourseFinalAssessmentType,
  type CourseRole,
  type CourseWeekPattern,
} from './enum';
export type * from './service/index.type';
