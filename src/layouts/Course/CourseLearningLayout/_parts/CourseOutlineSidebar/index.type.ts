import type { CourseOutlineNode } from '@/domains/Course';

import type { CourseOutlineResourcePageState } from '../../_common/model';

export interface CourseOutlineSidebarProps {
  courseId: string;
  courseName: string;
  editable: boolean;
  nodes: CourseOutlineNode[];
  allNodes: CourseOutlineNode[];
  selectedNodeId?: string;
  searchQuery: string;
  expandSearchResults: boolean;
  loading: boolean;
  error?: Error;
  resourcePageStateMap: Map<string, CourseOutlineResourcePageState>;
  onSearchQueryChange: (value: string) => void;
  onSelectNode: (nodeId: string) => void;
  onOpenCourseHome: () => void;
  onExpandNode: (nodeId: string) => void;
  onLoadMoreResources: (nodeId: string) => void;
  onRefresh: () => void;
  onRetry: () => void;
}

export interface CourseOutlineResourcePageTitleProps {
  state: CourseOutlineResourcePageState;
  onLoadMore: () => void;
}
