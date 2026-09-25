import { createContext, type ReactNode, useContext } from 'react';

import type { CourseDetail } from '@/domains/Course';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

export interface CourseContextValue {
  course: CourseDetail;
  refreshCourse: () => void;
}

interface CourseContextProviderProps extends CourseContextValue {
  children: ReactNode;
}

export const CourseContext = createContext<CourseContextValue | null>(null);

export function CourseContextProvider({
  course,
  refreshCourse,
  children,
}: CourseContextProviderProps) {
  return <CourseContext value={{ course, refreshCourse }}>{children}</CourseContext>;
}

export const useCourseContext = (): CourseContextValue => {
  const value = useContext(CourseContext);
  if (!value) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'useCourseContext must be used within CourseContext.Provider',
    });
  }
  return value;
};
