import { useRequiredContext } from '@/hooks/useRequiredContext';

import { CourseContext } from './CourseContext';

export function useCourseContext() {
  return useRequiredContext(CourseContext, 'CourseRoute');
}
