import type { CourseAssessmentItem } from '../entity/course';

export const getCourseAssessmentTotal = (items: CourseAssessmentItem[]) =>
  items.reduce(
    (sum, item) => sum + (Number.isFinite(item.weight) ? Math.max(0, item.weight) : 0),
    0
  );
