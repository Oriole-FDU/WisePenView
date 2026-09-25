import { createContext } from 'react';

import type { CourseDetail } from '@/domains/Course';

export interface CourseContextValue {
  course: CourseDetail;
  refreshCourse: () => void;
}

export const CourseContext = createContext<CourseContextValue | null>(null);
