import type { CourseSummary } from '@/domains/Course';

export interface CourseCardProps {
  course: CourseSummary;
  onClick: (course: CourseSummary) => void;
}
