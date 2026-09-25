import type { ReactNode } from 'react';

import { CourseContext, type CourseContextValue } from './CourseContext';

interface CourseContextProviderProps extends CourseContextValue {
  children: ReactNode;
}

export function CourseContextProvider({
  course,
  refreshCourse,
  children,
}: CourseContextProviderProps) {
  return <CourseContext value={{ course, refreshCourse }}>{children}</CourseContext>;
}
