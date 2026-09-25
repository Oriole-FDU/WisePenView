import { createContext, useContext } from 'react';

import type { CourseDetail } from '@/domains/Course';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

export interface CourseContextValue {
  course: CourseDetail;
  refreshCourse: () => void;
}

export const CourseContext = createContext<CourseContextValue | null>(null);

export const useCourseContext = (): CourseContextValue => {
  const value = useContext(CourseContext);
  if (!value) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'useCourseContext must be used within CourseContext.Provider',
    });
  }
  return value;
};
