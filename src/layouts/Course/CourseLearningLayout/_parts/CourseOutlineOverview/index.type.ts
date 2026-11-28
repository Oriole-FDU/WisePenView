import type { CourseOutlineContainerNode, CourseOutlineResourceNode } from '@/domains/Course';

export interface CourseOutlineOverviewProps {
  courseId: string;
  node: CourseOutlineContainerNode;
  resources: CourseOutlineResourceNode[];
  editable: boolean;
  onOpenResource: (nodeId: string) => void;
  onSaved: () => void;
}
