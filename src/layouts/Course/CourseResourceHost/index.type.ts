import type { ReactNode } from 'react';

import type { ResourceTarget } from '@/domains/Resource/model/resourceTarget';

export interface CourseResourceHostProps {
  courseId: string;
  target: ResourceTarget;
  fallbackHeader: ReactNode;
  onTargetChange: (target: ResourceTarget) => void;
  onClose: () => void;
}
