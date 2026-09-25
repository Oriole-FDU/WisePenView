import type { ReactNode } from 'react';

import { CourseContext, type CourseContextValue } from './CourseContext';

export function CourseProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: CourseContextValue;
}) {
  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}
